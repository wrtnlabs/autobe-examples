import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneComment";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test retrieving comments for a post that has no comments yet.
 *
 * 1. Create a community
 * 2. Register and authenticate a member
 * 3. Create a post in the community
 * 4. Retrieve comments without creating any
 * 5. Verify empty response with correct pagination
 */
export async function test_api_comment_retrieval_empty_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create community
  const communityConnection: api.IConnection = { host: connection.host };
  const community =
    await generate_random_reddit_clone_member_communities_create(
      communityConnection,
      {},
    );
  typia.assert(community);
  // 2. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "text",
        content: RandomGenerator.paragraph({ sentences: 5 }),
      },
    },
  );
  typia.assert(post);
  // 4. Retrieve comments (should be empty)
  const commentsResponse =
    await api.functional.redditClone.posts.comments.index(memberConnection, {
      postId: post.id,
      body: {},
    });
  typia.assert(commentsResponse);
  // 5. Validate empty response
  TestValidator.equals("data array is empty", commentsResponse.data.length, 0);
  TestValidator.equals(
    "pagination records is 0",
    commentsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    commentsResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    commentsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is default 20",
    commentsResponse.pagination.limit,
    20,
  );
  // 6. Test with different sort options
  const sortOptions: ("score" | "created_at" | "updated_at")[] = [
    "score",
    "created_at",
    "updated_at",
  ];
  for (const sort of sortOptions) {
    const sortedResponse =
      await api.functional.redditClone.posts.comments.index(memberConnection, {
        postId: post.id,
        body: {
          sort: sort,
        },
      });
    typia.assert(sortedResponse);
    TestValidator.equals(
      `data array is empty with sort ${sort}`,
      sortedResponse.data.length,
      0,
    );
    TestValidator.equals(
      `pagination records is 0 with sort ${sort}`,
      sortedResponse.pagination.records,
      0,
    );
  }
}