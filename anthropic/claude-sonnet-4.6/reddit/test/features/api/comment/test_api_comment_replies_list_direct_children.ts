import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityComment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";

export async function test_api_comment_replies_list_direct_children(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member and get an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create a top-level comment (parent_id = null/undefined)
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: null },
      },
    );
  typia.assert(topLevelComment);
  // 6. Create 3 replies to the top-level comment
  const REPLY_COUNT = 3;
  const replies = await ArrayUtil.asyncRepeat(REPLY_COUNT, async () => {
    const reply = await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: topLevelComment.id },
      },
    );
    typia.assert(reply);
    return reply;
  });
  // 7. Call the replies listing endpoint
  const result =
    await api.functional.community.member.posts.comments.replies.index(
      memberConnection,
      {
        postId: post.id,
        commentId: topLevelComment.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityComment.IRequest,
      },
    );
  typia.assert(result);
  // 8. Validate pagination metadata
  TestValidator.equals("current page", result.pagination.current, 1);
  TestValidator.equals("page limit", result.pagination.limit, 10);
  TestValidator.equals("total records", result.pagination.records, REPLY_COUNT);
  TestValidator.predicate(
    "pages count is correct",
    result.pagination.pages >= 1,
  );
  // 9. Validate data array count
  TestValidator.equals("reply count in data", result.data.length, REPLY_COUNT);
  // 10. Validate each reply's parent_id equals the top-level comment's id
  for (const reply of result.data) {
    TestValidator.equals(
      "reply parent_id equals top-level comment id",
      reply.parent_id,
      topLevelComment.id,
    );
  }
  // 11. Validate top-level comment itself is NOT in the reply list
  TestValidator.predicate(
    "top-level comment not in reply list",
    result.data.every((r) => r.id !== topLevelComment.id),
  );
  // 12. Validate replies are sorted newest-first (created_at DESC)
  for (let i = 0; i < result.data.length - 1; i++) {
    const current = result.data[i]!;
    const next = result.data[i + 1]!;
    TestValidator.predicate(
      "replies sorted newest first",
      new Date(current.created_at).getTime() >=
        new Date(next.created_at).getTime(),
    );
  }
  // 13. Validate all created reply IDs exist in response data
  const returnedIds = new Set(result.data.map((r) => r.id));
  for (const reply of replies) {
    TestValidator.predicate(
      "created reply appears in result",
      returnedIds.has(reply.id),
    );
  }
}
