import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_member_posts_excludes_deleted_posts(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member (test executor)
  const authMemberConnection: api.IConnection = { host: connection.host };
  const authMember = await authorize_member_join(authMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(authMember);
  // 2. Create target member account whose posts will be retrieved
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Create a community (owned by auth member)
  const community =
    await generate_random_reddit_community_member_communities_create(
      authMemberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Subscribe target member to the community (required before posting)
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      targetMemberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 5. Create 5 posts by the target member
  const posts: IRedditCommunityPost[] = [];
  for (let i = 0; i < 5; i++) {
    const post = await api.functional.redditCommunity.member.posts.create(
      targetMemberConnection,
      {
        body: {
          title: `Test Post ${i + 1}`,
          post_type: "text" as const,
          text_content: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditCommunityPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // Verify all 5 posts were created
  TestValidator.equals("posts created count", posts.length, 5);
  // 6. Delete 2 posts (indices 1 and 3)
  const postsToDelete = [posts[1], posts[3]];
  for (const postToDelete of postsToDelete) {
    await api.functional.redditCommunity.member.posts.erase(
      targetMemberConnection,
      {
        postId: postToDelete.id,
      },
    );
  }
  // 7. Retrieve the target member's posts list
  const postsResponse =
    await api.functional.redditCommunity.member.members.posts.index(
      authMemberConnection,
      {
        memberId: targetMember.id,
        body: {
          page: 1,
          limit: 20,
          sort: "new",
        } satisfies IRedditCommunityPost.IRequest,
      },
    );
  typia.assert(postsResponse);
  // 8. Verify only 3 non-deleted posts are returned
  TestValidator.equals("returned posts count", postsResponse.data.length, 3);
  // 9. Verify pagination records count reflects only active posts
  TestValidator.equals(
    "pagination records count",
    postsResponse.pagination.records,
    3,
  );
  // 10. Verify the deleted posts are not in the response
  const returnedPostIds = postsResponse.data.map((p) => p.id);
  TestValidator.predicate(
    "deleted post 1 not in results",
    !returnedPostIds.includes(posts[1].id),
  );
  TestValidator.predicate(
    "deleted post 2 not in results",
    !returnedPostIds.includes(posts[3].id),
  );
  // 11. Verify the remaining posts are the expected ones (indices 0, 2, 4)
  const expectedPostIds = [posts[0].id, posts[2].id, posts[4].id];
  for (const expectedId of expectedPostIds) {
    TestValidator.predicate(
      `expected post ${expectedId} in results`,
      returnedPostIds.includes(expectedId),
    );
  }
  // 12. Verify each returned post has correct structure with vote_score and comments_count
  for (const postSummary of postsResponse.data) {
    TestValidator.predicate(
      "vote_score is number",
      typeof postSummary.vote_score === "number",
    );
    TestValidator.predicate(
      "comments_count is number",
      typeof postSummary.comments_count === "number",
    );
    TestValidator.predicate(
      "comments_count is non-negative",
      postSummary.comments_count >= 0,
    );
  }
}
