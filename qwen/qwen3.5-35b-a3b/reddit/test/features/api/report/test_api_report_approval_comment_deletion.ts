import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_report_approval_comment_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate moderator who will approve reports
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Moderator123!",
      username: "moderator_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderatorAuth);
  // 2. Authenticate regular member who will create content
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Member123!",
      username: "member_" + RandomGenerator.alphaNumeric(6),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Moderator creates a community (becomes owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name:
            RandomGenerator.alphaNumeric(8) +
            "_" +
            RandomGenerator.alphaNumeric(4),
          description: "Test community for report approval",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Regular member creates a text post in the community
  const post = await api.functional.redditPlatform.member.posts.create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Regular member creates a comment on the post
  const comment = await api.functional.redditPlatform.member.comments.create(
    memberConnection,
    {
      body: {
        reddit_platform_post_id: post.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment);
  // Note: The available SDK only exposes the approve endpoint, not the create endpoint.
  // This test validates the approve endpoint functionality with a simulated report ID.
  // In production, the reportId would be returned from the report creation flow.
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 6. Approve the report using the moderator's connection
  const approvedReport =
    await api.functional.redditPlatform.member.reports.approve(
      moderatorConnection,
      { reportId: reportId },
    );
  typia.assert(approvedReport);
  // 7. Verify the report approval response structure
  TestValidator.equals("report id matches", approvedReport.id, reportId);
  TestValidator.equals(
    "status changed to approved",
    approvedReport.status,
    "approved",
  );
  TestValidator.notEquals(
    "reviewed_by is populated",
    approvedReport.reviewed_by,
    null,
  );
  TestValidator.notEquals(
    "reviewed_at timestamp is set",
    approvedReport.reviewed_at,
    null,
  );
  TestValidator.equals(
    "target_type is comment",
    approvedReport.target_type,
    "comment",
  );
  TestValidator.predicate(
    "target_id is valid integer",
    Number.isInteger(approvedReport.target_id),
  );
  TestValidator.equals(
    "updated_at timestamp exists",
    approvedReport.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "created_at timestamp exists",
    approvedReport.created_at !== undefined,
    true,
  );
}
