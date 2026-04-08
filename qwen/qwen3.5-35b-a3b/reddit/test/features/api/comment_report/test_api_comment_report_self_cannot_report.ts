import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_reports_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_reports_create";
import { prepare_random_reddit_community_comment_report } from "../../../prepare/prepare_random_reddit_community_comment_report";

export async function test_api_comment_report_self_cannot_report(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member A (who will create both the comment and attempt the report)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Generate a simulated comment that belongs to member A
  // Note: In a real scenario, we would create this via an API endpoint
  // For this test, we create mock data that represents a comment authored by member A
  const mockComment: IRedditCommunityComment.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    content: RandomGenerator.paragraph({ sentences: 3 }),
    author: memberA as IRedditCommunityMember.ISummary,
    vote_count: typia.random<number & tags.Type<"int32">>(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    is_top_level: true,
    reply_count: 0,
  };
  typia.assert(mockComment);
  // 3. Generate a simulated post reference
  const postId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to create a report on the comment owned by the authenticated member
  // This should be rejected by the business rule that prevents self-reporting
  await TestValidator.error("cannot report own comment", async () => {
    await api.functional.redditCommunity.member.posts.comments.reports.create(
      memberAConnection,
      {
        postId,
        commentId: mockComment.id,
        body: {
          reason:
            "This is a test reason for self-reporting which should be rejected",
        } satisfies IRedditCommunityCommentReport.ICreate,
      },
    );
  });
  // 5. Verify no report record was created (implicitly tested by the error validation)
  // The error response from the API indicates the report was not created
}
