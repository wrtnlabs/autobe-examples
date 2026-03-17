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

export async function test_api_post_comments_listing_parent_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await api.functional.community.member.communities.subscriptions.create(
      memberConnection,
      { communityId: community.id },
    );
  typia.assert(subscription);
  // 4. Create a text post
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        type: "text",
        body: RandomGenerator.content({ paragraphs: 1 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create 2 top-level comments (no parentId)
  const topComment1 =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: null },
      },
    );
  typia.assert(topComment1);
  const topComment2 =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: null },
      },
    );
  typia.assert(topComment2);
  // 6. Create 1 nested reply to topComment1
  const replyComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: { parent_id: topComment1.id },
      },
    );
  typia.assert(replyComment);
  // Guest connection for listing (no auth required)
  const guestConnection: api.IConnection = { host: connection.host };
  // Test 1: Filter to top-level comments only (parentId = null)
  const topLevelResult = await api.functional.community.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: { parentId: null } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(topLevelResult);
  TestValidator.equals(
    "top-level filter: records count",
    topLevelResult.pagination.records,
    2,
  );
  TestValidator.predicate(
    "top-level filter: all items have null parent_id",
    topLevelResult.data.every((c) => c.parent_id === null),
  );
  TestValidator.predicate(
    "top-level filter: reply not included",
    topLevelResult.data.every((c) => c.id !== replyComment.id),
  );
  // Test 2: Filter to replies of topComment1
  const repliesResult = await api.functional.community.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: { parentId: topComment1.id } satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(repliesResult);
  TestValidator.equals(
    "reply filter: records count",
    repliesResult.pagination.records,
    1,
  );
  TestValidator.predicate(
    "reply filter: returned comment parent_id equals topComment1.id",
    repliesResult.data.every((c) => c.parent_id === topComment1.id),
  );
  // Test 3: No filter - all comments returned
  const allResult = await api.functional.community.posts.comments.index(
    guestConnection,
    {
      postId: post.id,
      body: {} satisfies ICommunityComment.IRequest,
    },
  );
  typia.assert(allResult);
  TestValidator.equals(
    "no filter: total records count",
    allResult.pagination.records,
    3,
  );
  TestValidator.predicate(
    "no filter: reply has non-null parent_id",
    allResult.data.some(
      (c) => c.id === replyComment.id && c.parent_id !== null,
    ),
  );
}
