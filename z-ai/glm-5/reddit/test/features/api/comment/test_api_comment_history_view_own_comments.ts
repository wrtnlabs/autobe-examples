import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_history_view_own_comments(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {});
  typia.assert(authResult);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        contentType: "text",
        textContent: RandomGenerator.content({ paragraphs: 2 }),
        linkUrl: null,
        imageUrl: null,
      },
    },
  );
  typia.assert(post);
  // 5. Create multiple comments on the post
  const comments = await ArrayUtil.asyncRepeat(3, async () => {
    return await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  });
  // 6. Call history endpoint with authorId
  const historyResult =
    await api.functional.communityPlatform.member.comments.history(
      memberConnection,
      {
        body: {
          authorId: authResult.id,
          sort: "new",
          limit: 10,
        } satisfies ICommunityPlatformComment.IRequest,
      },
    );
  typia.assert(historyResult);
  // 7. Validate results
  // Check pagination metadata
  TestValidator.predicate(
    "pagination exists",
    () => historyResult.pagination !== undefined,
  );
  TestValidator.predicate(
    "has records",
    () => historyResult.pagination.records >= comments.length,
  );
  TestValidator.predicate(
    "has current page",
    () => historyResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "has limit",
    () => historyResult.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "has pages",
    () => historyResult.pagination.pages >= 1,
  );
  // Check data exists
  TestValidator.predicate(
    "has data",
    () => historyResult.data.length >= comments.length,
  );
  // Check all created comments are in the result
  const historyCommentIds = historyResult.data.map((c) => c.id);
  for (const comment of comments) {
    TestValidator.predicate(`comment ${comment.id} exists in history`, () =>
      historyCommentIds.includes(comment.id),
    );
  }
  // Check author information is correct
  for (const commentSummary of historyResult.data) {
    TestValidator.equals("author id", commentSummary.author.id, authResult.id);
    TestValidator.equals(
      "author username",
      commentSummary.author.username,
      authResult.username,
    );
  }
  // Check post information exists
  for (const commentSummary of historyResult.data) {
    TestValidator.predicate(
      "post has title",
      () => commentSummary.post.title.length > 0,
    );
    TestValidator.predicate(
      "post has community",
      () => commentSummary.post.community !== undefined,
    );
  }
  // Check comments are ordered by created_at DESC (most recent first)
  for (let i = 0; i < historyResult.data.length - 1; i++) {
    const current = historyResult.data[i];
    const next = historyResult.data[i + 1];
    TestValidator.predicate(
      "comments ordered by created_at DESC",
      () => new Date(current.createdAt) >= new Date(next.createdAt),
    );
  }
  // Check score is initialized (should be 0 for new comments)
  for (const commentSummary of historyResult.data) {
    TestValidator.predicate(
      "score is a number",
      () => typeof commentSummary.score === "number",
    );
  }
}
