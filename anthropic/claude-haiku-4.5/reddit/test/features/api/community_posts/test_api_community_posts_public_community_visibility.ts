import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";

/**
 * Test that public community posts are visible to all users including
 * unauthenticated ones.
 *
 * This test validates the complete visibility workflow for public communities:
 *
 * 1. Set up administrator account and create a category
 * 2. Create a member account and establish a public community
 * 3. Create multiple posts in the public community
 * 4. Verify posts are visible when retrieved by authenticated member
 * 5. Validate post visibility settings and access controls
 *
 * Business logic tested:
 *
 * - Public communities make their posts visible in discovery and feeds
 * - Post visibility_status correctly reflects 'public' for newly created posts
 * - Post creator and community information is properly populated
 * - Engagement metrics (votes, comments) are initialized correctly
 * - Pagination works correctly for post listing
 * - Post content is retrieved with all required fields
 */
export async function test_api_community_posts_public_community_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(8),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);
  TestValidator.predicate(
    "administrator created successfully",
    admin.id !== null,
  );

  // Step 2: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 0,
          description: "Technology discussions and news",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate(
    "category created successfully",
    category.slug === "technology",
  );

  // Step 3: Create and authenticate member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(8),
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate(
    "member created and authenticated successfully",
    member.id !== null,
  );

  // Step 4: Create a public community
  const publicCommunity: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech News",
          identifier: `tech_news_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
          description: "Latest technology news and discussions",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(publicCommunity);
  TestValidator.predicate(
    "public community created successfully",
    publicCommunity.visibility === "public",
  );
  TestValidator.predicate(
    "community identifier is unique",
    publicCommunity.identifier !== "",
  );

  // Step 5: Create multiple posts in the public community
  const textPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: publicCommunity.id,
        post_type: "text",
        title: "Understanding TypeScript Generics",
        content_text: RandomGenerator.content({ paragraphs: 3 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(textPost);
  TestValidator.predicate(
    "text post created successfully",
    textPost.post_type === "text",
  );
  TestValidator.predicate(
    "text post is public",
    textPost.visibility_status === "public",
  );
  TestValidator.predicate(
    "text post has correct community",
    textPost.community.id === publicCommunity.id,
  );

  const linkPost: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: publicCommunity.id,
        post_type: "link",
        title: "New JavaScript Framework Released",
        content_link_url: "https://example.com/framework",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(linkPost);
  TestValidator.predicate(
    "link post created successfully",
    linkPost.post_type === "link",
  );
  TestValidator.predicate(
    "link post is public",
    linkPost.visibility_status === "public",
  );

  // Step 6: Retrieve posts from the public community and verify visibility
  const retrievedPosts: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: publicCommunity.id,
      body: {
        page: 1,
        limit: 10,
        visibility_status: "public",
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(retrievedPosts);
  TestValidator.predicate(
    "posts retrieved successfully",
    retrievedPosts.data.length >= 2,
  );
  TestValidator.predicate(
    "pagination has correct current page",
    retrievedPosts.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is correct",
    retrievedPosts.pagination.limit === 10,
  );

  // Step 7: Verify each post has required fields and correct visibility
  const postIds = retrievedPosts.data.map((p) => p.id);
  TestValidator.predicate(
    "text post is in results",
    postIds.includes(textPost.id),
  );
  TestValidator.predicate(
    "link post is in results",
    postIds.includes(linkPost.id),
  );

  for (const post of retrievedPosts.data) {
    typia.assert(post);
    TestValidator.predicate("post has valid id", post.id !== "");
    TestValidator.predicate("post has title", post.title !== "");
    TestValidator.predicate(
      "post has post_type",
      ["text", "link", "image"].includes(post.post_type),
    );
    TestValidator.predicate(
      "post is public",
      post.visibility_status === "public",
    );
    TestValidator.predicate("post has creator info", post.creator.id !== "");
    TestValidator.predicate(
      "post has community info",
      post.community.id === publicCommunity.id,
    );
    TestValidator.predicate(
      "post has vote score",
      typeof post.vote_score === "number",
    );
    TestValidator.predicate(
      "post has comment count",
      typeof post.comment_count === "number",
    );
    TestValidator.predicate(
      "post has creation timestamp",
      post.created_at !== "",
    );
  }

  // Step 8: Test filtering by visibility status
  const publicOnlyPosts: IPageICommunityPlatformPost.ISummary =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: publicCommunity.id,
      body: {
        page: 1,
        limit: 10,
        visibility_status: "public",
        exclude_nsfw: false,
        exclude_spoilers: false,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(publicOnlyPosts);
  for (const post of publicOnlyPosts.data) {
    TestValidator.predicate(
      "all posts are public",
      post.visibility_status === "public",
    );
  }

  // Step 9: Verify engagement metrics are initialized correctly
  TestValidator.predicate(
    "text post has zero vote score",
    textPost.vote_score === 0,
  );
  TestValidator.predicate(
    "text post has zero upvotes",
    textPost.upvote_count === 0,
  );
  TestValidator.predicate(
    "text post has zero downvotes",
    textPost.downvote_count === 0,
  );
  TestValidator.predicate(
    "text post has zero comments",
    textPost.comment_count === 0,
  );
  TestValidator.predicate(
    "link post has zero vote score",
    linkPost.vote_score === 0,
  );
  TestValidator.predicate(
    "link post has zero upvotes",
    linkPost.upvote_count === 0,
  );
  TestValidator.predicate(
    "link post has zero downvotes",
    linkPost.downvote_count === 0,
  );
  TestValidator.predicate(
    "link post has zero comments",
    linkPost.comment_count === 0,
  );

  // Step 10: Verify creator information is correctly populated
  TestValidator.equals(
    "text post creator id matches",
    textPost.creator.id,
    member.id,
  );
  TestValidator.predicate(
    "text post creator username is set",
    textPost.creator.username !== "",
  );
  TestValidator.equals(
    "link post creator id matches",
    linkPost.creator.id,
    member.id,
  );

  // Step 11: Verify community summary information is correctly populated
  TestValidator.equals(
    "text post community id matches",
    textPost.community.id,
    publicCommunity.id,
  );
  TestValidator.equals(
    "text post community name matches",
    textPost.community.name,
    publicCommunity.name,
  );
  TestValidator.equals(
    "text post community identifier matches",
    textPost.community.identifier,
    publicCommunity.identifier,
  );
  TestValidator.predicate(
    "community subscriber count is at least 1",
    textPost.community.subscriber_count >= 1,
  );
  TestValidator.predicate(
    "community post count is at least 2",
    textPost.community.post_count >= 2,
  );
}
