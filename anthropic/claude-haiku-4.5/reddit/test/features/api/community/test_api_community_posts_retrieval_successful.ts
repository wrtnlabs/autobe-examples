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
 * Test successful retrieval of posts from a community with default pagination
 * and filtering.
 *
 * Creates a community, adds multiple posts with varying visibility statuses and
 * content types, then retrieves the posts list with default parameters (page 1,
 * limit 20). Verifies that public posts are returned with correct pagination
 * metadata, post summaries include all required fields (title, post_type,
 * vote_score, comment_count, creator info), and the response structure matches
 * the paginated response specification.
 *
 * Test workflow:
 *
 * 1. Administrator joins and creates a category for community classification
 * 2. Member 1 joins and creates a community with the category
 * 3. Member 1 creates multiple posts (text posts and link posts)
 * 4. Member 2 joins and retrieves posts from the community with default pagination
 * 5. Verify pagination metadata is correct (page, limit, records, total pages)
 * 6. Verify all post summaries contain required fields and are public
 * 7. Verify response structure matches IPageICommunityPlatformPost.ISummary
 */
export async function test_api_community_posts_retrieval_successful(
  connection: api.IConnection,
) {
  // Step 1: Administrator creates a category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          description: "Tech discussions and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Member 1 joins and creates a community
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member1);

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussions",
          identifier: RandomGenerator.alphaNumeric(6).toLowerCase(),
          description: "A community for technology enthusiasts",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Member 1 creates multiple posts
  const textPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Introduction to TypeScript",
        content_text: RandomGenerator.content({ paragraphs: 3 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);

  const linkPost = await api.functional.communityPlatform.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        post_type: "link",
        title: "New TypeScript Release",
        content_link_url: "https://www.typescriptlang.org/",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);

  const anotherTextPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Best Practices in Web Development",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(anotherTextPost);

  // Step 4: Member 2 joins and retrieves posts
  const member2Email = typia.random<string & tags.Format<"email">>();
  await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: RandomGenerator.alphabets(10),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });

  // Step 5: Retrieve posts with default pagination
  const postsResponse =
    await api.functional.communityPlatform.communities.posts.index(connection, {
      communityId: community.id,
      body: {
        page: 1,
        limit: 20,
      } satisfies ICommunityPlatformPost.IRequest,
    });
  typia.assert(postsResponse);

  // Step 6: Verify pagination metadata
  TestValidator.equals(
    "pagination current page should be 1",
    postsResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 20",
    postsResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "total records should be 3",
    postsResponse.pagination.records,
    3,
  );
  TestValidator.equals(
    "total pages should be 1",
    postsResponse.pagination.pages,
    1,
  );

  // Step 7: Verify post summaries contain required fields
  TestValidator.predicate(
    "should return 3 posts",
    postsResponse.data.length === 3,
  );

  for (const post of postsResponse.data) {
    // Verify all required fields are present
    TestValidator.predicate("post should have id", post.id !== undefined);
    TestValidator.predicate(
      "post should have title",
      post.title !== undefined && post.title.length > 0,
    );
    TestValidator.predicate(
      "post should have post_type",
      post.post_type !== undefined,
    );
    TestValidator.predicate(
      "post should have vote_score",
      post.vote_score !== undefined,
    );
    TestValidator.predicate(
      "post should have upvote_count",
      post.upvote_count !== undefined,
    );
    TestValidator.predicate(
      "post should have downvote_count",
      post.downvote_count !== undefined,
    );
    TestValidator.predicate(
      "post should have comment_count",
      post.comment_count !== undefined,
    );
    TestValidator.predicate(
      "post should have visibility_status",
      post.visibility_status !== undefined,
    );
    TestValidator.predicate(
      "post should have creator",
      post.creator !== undefined,
    );
    TestValidator.predicate(
      "post should have community",
      post.community !== undefined,
    );
    TestValidator.predicate(
      "post should have created_at",
      post.created_at !== undefined,
    );
    TestValidator.predicate(
      "post should have updated_at",
      post.updated_at !== undefined,
    );

    // Verify creator has required fields
    TestValidator.predicate(
      "creator should have id",
      post.creator.id !== undefined,
    );
    TestValidator.predicate(
      "creator should have username",
      post.creator.username !== undefined,
    );
    TestValidator.predicate(
      "creator should have email",
      post.creator.email !== undefined,
    );

    // Verify community has required fields
    TestValidator.predicate(
      "community should have id",
      post.community.id !== undefined,
    );
    TestValidator.predicate(
      "community should have identifier",
      post.community.identifier !== undefined,
    );
    TestValidator.predicate(
      "community should have name",
      post.community.name !== undefined,
    );

    // Verify all posts have public visibility
    TestValidator.equals(
      "post visibility should be public",
      post.visibility_status,
      "public",
    );

    // Verify vote scores are non-negative
    TestValidator.predicate("vote_score should be >= 0", post.vote_score >= 0);
    TestValidator.predicate(
      "upvote_count should be >= 0",
      post.upvote_count >= 0,
    );
    TestValidator.predicate(
      "downvote_count should be >= 0",
      post.downvote_count >= 0,
    );
    TestValidator.predicate(
      "comment_count should be >= 0",
      post.comment_count >= 0,
    );
  }

  // Step 8: Verify specific posts are in the response
  const titles = postsResponse.data.map((p) => p.title);
  TestValidator.predicate(
    "should contain text post",
    titles.includes("Introduction to TypeScript"),
  );
  TestValidator.predicate(
    "should contain link post",
    titles.includes("New TypeScript Release"),
  );
  TestValidator.predicate(
    "should contain another text post",
    titles.includes("Best Practices in Web Development"),
  );
}
