import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostLink";

/**
 * Test retrieving links attached to a community post, with validation of
 * pagination, sorting, and edge cases.
 *
 * 1. Register as a new platform member.
 * 2. Create a new community as the member.
 * 3. Create a post in the community as the member.
 * 4. Retrieve links for a post that has no links (should return empty array with
 *    valid pagination).
 * 5. (If possible, create multiple links for the post.)
 * 6. Retrieve links for pagination scenarios, testing varying limit and page, and
 *    sorting by available fields.
 * 7. Attempt to retrieve links for a non-existent post (should return error).
 * 8. (Edge: For access violation, simulate as a different
 *    unauthenticated/unauthorized user and check for error.)
 */
export async function test_api_post_links_retrieve_links_list_pagination_sorting(
  connection: api.IConnection,
) {
  // 1. Register new member
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create new community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          title: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: RandomGenerator.alphaNumeric(8),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Create new post
  const post = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_platform_community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_body: RandomGenerator.content({ paragraphs: 1 }),
        content_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);

  // 4. Retrieve links for a post with no links: expect empty data array
  const emptyLinks = await api.functional.communityPlatform.posts.links.index(
    connection,
    {
      postId: post.id,
      body: {
        postId: post.id,
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies ICommunityPlatformPostLink.IRequest,
    },
  );
  typia.assert(emptyLinks);
  TestValidator.equals(
    "empty links - should have no data",
    emptyLinks.data.length,
    0,
  );
  TestValidator.equals(
    "empty links - correct pagination",
    emptyLinks.pagination.current,
    1,
  );

  // Edge: Non-existent post (invalid UUID)
  await TestValidator.error(
    "should error for non-existent postId",
    async () => {
      await api.functional.communityPlatform.posts.links.index(connection, {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          postId: typia.random<string & tags.Format<"uuid">>(),
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostLink.IRequest,
      });
    },
  );

  // Edge: Can optionally run an unauthenticated request (simulate) to check public accessibility
  const guestConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "should deny access for guest if post is restricted",
    async () => {
      await api.functional.communityPlatform.posts.links.index(guestConn, {
        postId: post.id,
        body: { postId: post.id } satisfies ICommunityPlatformPostLink.IRequest,
      });
    },
  );

  // Additional edge: With more links. (Skipping actual link creation if API for it is not available)
  // If an actual link creation API existed, you would populate multiple links, then test:
  //  - Pagination (page/limit)
  //  - Sorting (sort_by, sort_order)
  //  - Filtering (url, preview_title, etc.)
  //  - Correct structure for data properties (url, preview_title, preview_image_uri)
}
