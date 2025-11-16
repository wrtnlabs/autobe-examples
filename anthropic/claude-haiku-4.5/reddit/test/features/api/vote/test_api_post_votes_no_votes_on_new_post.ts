import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVote";

/**
 * Retrieve votes on a newly created post with no votes.
 *
 * This test validates the votes endpoint behavior when called on a fresh post
 * that has not yet received any votes. It ensures the API correctly handles
 * zero-vote scenarios by returning empty data with proper pagination metadata.
 *
 * Test flow:
 *
 * 1. Create administrator account
 * 2. Create category for community classification
 * 3. Create member account
 * 4. Create community
 * 5. Create new post (0 votes)
 * 6. Retrieve votes for the post
 * 7. Validate empty data array is returned
 * 8. Validate pagination shows 0 total records and 0 pages
 */
export async function test_api_post_votes_no_votes_on_new_post(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "AdminPassword123",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://admin.example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123",
        href: "https://member.example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create new post (0 votes)
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Retrieve votes for the newly created post
  const votesResponse: IPageICommunityPlatformVote.ISummary =
    await api.functional.communityPlatform.posts.votes.index(connection, {
      postId: post.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformVote.IRequest,
    });
  typia.assert(votesResponse);

  // 7. Validate empty data array is returned
  TestValidator.equals(
    "votes data array should be empty",
    votesResponse.data.length,
    0,
  );
  TestValidator.predicate(
    "votes data should be an empty array",
    Array.isArray(votesResponse.data),
  );

  // 8. Validate pagination shows 0 total records and 0 pages
  TestValidator.equals(
    "pagination records should be 0",
    votesResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    votesResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current should be 1",
    votesResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    votesResponse.pagination.limit,
    20,
  );
}
