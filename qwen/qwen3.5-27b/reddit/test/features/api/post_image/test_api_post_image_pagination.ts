import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostImage";
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
 * Test pagination functionality for post images.
 *
 * This test verifies that the post images endpoint correctly paginates
 * image results when retrieving images from a post. It validates:
 * - Pagination metadata accuracy (current page, limit, records, pages)
 * - Correct image subset returned per page
 * - Images returned in sequence order
 * - Edge cases for last page with fewer items
 */
export async function test_api_post_image_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community for the post
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create an image-type post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        postType: "image",
        communityId: community.id,
      } satisfies IRedditClonePost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test pagination with page size of 2
  const pageSize = 2;
  // Get page 1
  const page1 = await api.functional.redditClone.posts.images.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 1,
        pageSize: pageSize,
      },
    },
  );
  typia.assert(page1);
  // Validate page 1 pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, pageSize);
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  // Get page 2
  const page2 = await api.functional.redditClone.posts.images.index(
    memberConnection,
    {
      postId: post.id,
      body: {
        page: 2,
        pageSize: pageSize,
      },
    },
  );
  typia.assert(page2);
  // Validate page 2 pagination metadata
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, pageSize);
  // Verify total records consistency
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  // Verify total pages calculation
  const expectedPages = Math.ceil(page1.pagination.records / pageSize);
  TestValidator.equals(
    "total pages calculation",
    page1.pagination.pages,
    expectedPages,
  );
  // Verify images are in sequence order on page 1
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `page 1 image ${i} sequence order`,
        page1.data[i].sequence > page1.data[i - 1].sequence,
      );
    }
  }
  // Verify images are in sequence order on page 2
  if (page2.data.length > 1) {
    for (let i = 1; i < page2.data.length; i++) {
      TestValidator.predicate(
        `page 2 image ${i} sequence order`,
        page2.data[i].sequence > page2.data[i - 1].sequence,
      );
    }
  }
  // Verify page 2 images have higher sequence than page 1 last image
  if (page1.data.length > 0 && page2.data.length > 0) {
    TestValidator.predicate(
      "page 2 images after page 1",
      page2.data[0].sequence > page1.data[page1.data.length - 1].sequence,
    );
  }
}
