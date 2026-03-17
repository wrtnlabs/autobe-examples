import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_reports_create } from "../../../generate/generate_random_reddit_community_member_reports_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_report } from "../../../prepare/prepare_random_reddit_community_report";

export async function test_api_report_cannot_report_own_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate Member A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuth = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAAuth);
  // 2. Member A creates a post in a community
  // Note: The community_id must come from a community where the member is subscribed
  // Since we cannot create communities or subscriptions in this test's scope,
  // we will use a randomly generated UUID for the community_id
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  const testPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    community_id: testCommunityId,
    post_type: "text" as const,
    body: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IRedditCommunityPost.ICreate;
  const createdPost = await api.functional.redditCommunity.member.posts.create(
    memberAConnection,
    { body: testPostBody },
  );
  typia.assert(createdPost);
  // 3. Member A attempts to report their own post - should be rejected
  const reportOwnPostBody = {
    community_id: testCommunityId,
    target_type: "post" as const,
    target_id: createdPost.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;
  // This should fail because member A is trying to report their own content
  await TestValidator.error("cannot report own post", async () => {
    await api.functional.redditCommunity.member.reports.create(
      memberAConnection,
      {
        body: reportOwnPostBody,
      },
    );
  });
  // 4. Member A creates a comment on their post
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityComment.ICreate;
  const createdComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberAConnection,
      {
        postId: createdPost.id,
        body: commentBody,
      },
    );
  typia.assert(createdComment);
  // 5. Member A attempts to report their own comment - should be rejected
  const reportOwnCommentBody = {
    community_id: testCommunityId,
    target_type: "comment" as const,
    target_id: createdComment.id,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditCommunityReport.ICreate;
  // This should fail because member A is trying to report their own content
  await TestValidator.error("cannot report own comment", async () => {
    await api.functional.redditCommunity.member.reports.create(
      memberAConnection,
      {
        body: reportOwnCommentBody,
      },
    );
  });
}
