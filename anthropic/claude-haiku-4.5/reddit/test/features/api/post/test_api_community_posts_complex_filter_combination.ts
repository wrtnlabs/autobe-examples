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
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

export async function test_api_community_posts_complex_filter_combination(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and member accounts for multi-actor testing
  const adminMember = await api.functional.auth.administrator.join(connection, {
    body: {
      email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: "TestPassword123!",
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: "Test Administrator",
      href: "http://localhost/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminMember);

  // Step 2: Create category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology discussions",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member accounts for posting
  const member1Email = `member1_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: "TestPassword123!",
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  const member2Email = `member2_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: `user_${RandomGenerator.alphaNumeric(8)}`,
      password: "TestPassword123!",
      href: "http://localhost/register",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member2);

  // Step 4: Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          description: "A place for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create posts with various combinations for testing complex filters
  const textPublicPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Public Text Post",
        content_text: "This is a public text post",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPublicPost);

  const textPublicNsfwPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Public NSFW Text Post",
        content_text: "This is a public NSFW text post",
        is_nsfw: true,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPublicNsfwPost);

  const linkPublicPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "Public Link Post",
        content_link_url: "https://example.com",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPublicPost);

  const imagePost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "image",
        title: "Public Image Post",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(imagePost);

  // Step 6: Switch to member2 to vote on posts and increase vote scores
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create multiple votes to achieve min_vote_score threshold
  for (let i = 0; i < 5; i++) {
    await api.functional.communityPlatform.member.votes.create(connection, {
      body: {
        content_type: "post",
        content_id: textPublicPost.id,
        vote_type: "upvote",
      } satisfies ICommunityPlatformVote.ICreate,
    });
  }

  // Step 7: Test complex filter combination - public text posts without NSFW with min_vote_score=5
  const filterResponse =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        post_type: "text",
        visibility_status: "public",
        exclude_nsfw: true,
        min_vote_score: 5,
        sort_by: "createdAt",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(filterResponse);

  // Verify that results only contain text posts that are public and not NSFW
  for (const post of filterResponse.data) {
    TestValidator.equals("post type should be text", post.post_type, "text");
    TestValidator.equals(
      "visibility should be public",
      post.visibility_status,
      "public",
    );
    TestValidator.equals("should not be NSFW", post.is_nsfw, false);
  }

  // Step 8: Test pagination with complex filters
  const paginatedResponse =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 5,
        visibility_status: "public",
        exclude_nsfw: true,
        sort_by: "createdAt",
        sort_order: "asc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(paginatedResponse);
  TestValidator.predicate(
    "pagination should have valid data",
    paginatedResponse.data.length <= 5,
  );

  // Step 9: Test sorting with complex filters
  const sortedResponse =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        visibility_status: "public",
        exclude_nsfw: true,
        sort_by: "voteScore",
        sort_order: "desc",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(sortedResponse);

  // Verify sorting order - vote scores should be in descending order
  for (let i = 1; i < sortedResponse.data.length; i++) {
    TestValidator.predicate(
      "vote scores should be in descending order",
      sortedResponse.data[i - 1].vote_score >=
        sortedResponse.data[i].vote_score,
    );
  }

  // Step 10: Test search with complex filters
  const searchResponse =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 10,
        visibility_status: "public",
        exclude_nsfw: true,
        search: "Public",
        sort_by: "relevance",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(searchResponse);

  // Verify search results contain the search term
  for (const post of searchResponse.data) {
    TestValidator.predicate(
      "post title should contain search term",
      post.title.toLowerCase().includes("public"),
    );
  }
}
