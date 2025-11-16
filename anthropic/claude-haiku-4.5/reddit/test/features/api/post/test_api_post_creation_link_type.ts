import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";

/**
 * Validates successful creation of a link-type post in a community.
 *
 * This test ensures that link posts are properly created with:
 *
 * - Correct post_type='link' designation
 * - Provided link metadata (URL, title, description, thumbnail) properly stored
 * - Content_text=null for link posts (text-specific field)
 * - Initialized engagement metrics at zero
 * - Proper default values for metadata flags
 * - Complete creator and community information embedded in response
 *
 * The test validates the polymorphic post type system where link posts separate
 * content fields from text posts, ensuring data integrity and proper type
 * differentiation.
 */
export async function test_api_post_creation_link_type(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // 2. Create category for community classification
  const categoryName = RandomGenerator.name();
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          display_order: RandomGenerator.pick([0, 1, 2, 3, 4, 5]),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for posting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphabets(8);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community for link post
  const communityIdentifier = RandomGenerator.alphabets(10).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "text_and_links",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create link-type post with Open Graph metadata
  const linkUrl = "https://example.com/article-about-technology";
  const linkTitle = RandomGenerator.name(3);
  const linkDescription = RandomGenerator.paragraph();
  const linkThumbnailUrl = "https://example.com/images/thumbnail.png";

  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "link",
        title: RandomGenerator.name(4),
        content_link_url: linkUrl,
        content_link_title: linkTitle,
        content_link_description: linkDescription,
        content_link_thumbnail_url: linkThumbnailUrl,
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Validate post_type is correctly set to 'link'
  TestValidator.equals("post_type should be link", post.post_type, "link");

  // 7. Validate link metadata is properly stored
  TestValidator.equals(
    "content_link_url should match provided URL",
    post.content_link_url,
    linkUrl,
  );
  TestValidator.equals(
    "content_link_title should match provided title",
    post.content_link_title,
    linkTitle,
  );
  TestValidator.equals(
    "content_link_description should match provided description",
    post.content_link_description,
    linkDescription,
  );
  TestValidator.equals(
    "content_link_thumbnail_url should match provided thumbnail",
    post.content_link_thumbnail_url,
    linkThumbnailUrl,
  );

  // 8. Validate content_text is null for link posts
  TestValidator.equals(
    "content_text should be null for link posts",
    post.content_text,
    null,
  );

  // 9. Validate engagement metrics are initialized to zero
  TestValidator.equals("vote_score should start at 0", post.vote_score, 0);
  TestValidator.equals("upvote_count should start at 0", post.upvote_count, 0);
  TestValidator.equals(
    "downvote_count should start at 0",
    post.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment_count should start at 0",
    post.comment_count,
    0,
  );

  // 10. Validate default metadata flags
  TestValidator.predicate(
    "is_nsfw should be false by default",
    post.is_nsfw === false,
  );
  TestValidator.predicate(
    "has_spoiler should be false by default",
    post.has_spoiler === false,
  );
  TestValidator.predicate(
    "is_locked should be false by default",
    post.is_locked === false,
  );
  TestValidator.predicate(
    "is_pinned should be false by default",
    post.is_pinned === false,
  );

  // 11. Validate visibility_status default
  TestValidator.equals(
    "visibility_status should be public by default",
    post.visibility_status,
    "public",
  );

  // 12. Validate creator information is embedded
  TestValidator.equals(
    "creator id should match authenticated member",
    post.creator.id,
    member.id,
  );
  TestValidator.equals(
    "creator username should match member username",
    post.creator.username,
    memberUsername,
  );
  TestValidator.equals(
    "creator email should match member email",
    post.creator.email,
    memberEmail,
  );

  // 13. Validate community information is embedded
  TestValidator.equals(
    "community id should match created community",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "community identifier should match",
    post.community.identifier,
    communityIdentifier,
  );

  // 14. Validate timestamps are properly set
  TestValidator.predicate(
    "created_at should be a valid ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.created_at),
  );
  TestValidator.predicate(
    "updated_at should be a valid ISO date-time string",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(post.updated_at),
  );

  // 15. Validate deleted_at is null for newly created post
  TestValidator.equals(
    "deleted_at should be null for active post",
    post.deleted_at,
    null,
  );
}
