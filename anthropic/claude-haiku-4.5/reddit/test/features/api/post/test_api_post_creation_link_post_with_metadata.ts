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
 * Test successful creation of a link-based post with external URL and Open
 * Graph metadata.
 *
 * This test validates that members can create link posts with both
 * client-provided and auto-extracted Open Graph metadata. The test covers:
 *
 * - Creating a member account and authenticating
 * - Setting up a community for posting
 * - Creating link posts with explicit metadata
 * - Creating link posts that rely on backend metadata extraction
 * - Verifying that link post properties are correctly initialized
 * - Confirming engagement metrics start at zero
 * - Validating visibility and timestamp fields
 */
export async function test_api_post_creation_link_post_with_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphabets(10);

  const memberCreateBody = {
    email: memberEmail,
    username: memberUsername,
    password: memberPassword,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformMember.ICreate;

  const memberResponse = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberResponse);
  TestValidator.equals(
    "member account created with id",
    typeof memberResponse.id,
    "string",
  );
  TestValidator.equals(
    "member token issued",
    typeof memberResponse.token.access,
    "string",
  );

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(12);
  const adminPassword = RandomGenerator.alphabets(10);

  const adminCreateBody = {
    email: adminEmail,
    username: adminUsername,
    password: adminPassword,
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminResponse = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminCreateBody,
    },
  );
  typia.assert(adminResponse);
  TestValidator.equals(
    "administrator account created",
    typeof adminResponse.id,
    "string",
  );

  // Step 3: Create category for community
  const categoryCreateBody = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(10),
    display_order: 1,
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryCreateBody,
      },
    );
  typia.assert(category);
  TestValidator.equals(
    "category created with slug",
    typeof category.slug,
    "string",
  );

  // Step 4: Switch to member context and create community
  const memberConn: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: memberResponse.token.access,
    },
  };

  const communityCreateBody = {
    name: RandomGenerator.name(),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConn,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created",
    community.identifier,
    communityCreateBody.identifier,
  );

  // Step 5: Create link post with client-provided Open Graph metadata
  const linkUrl = "https://example.com/article";
  const clientProvidedTitle = "Example Article Title";
  const clientProvidedDescription = RandomGenerator.paragraph({ sentences: 2 });
  const clientProvidedThumbnail = typia.random<string & tags.Format<"uri">>();

  const linkPostWithMetadataBody = {
    community_id: community.id,
    post_type: "link",
    title: RandomGenerator.name(),
    content_link_url: linkUrl,
    content_link_title: clientProvidedTitle,
    content_link_description: clientProvidedDescription,
    content_link_thumbnail_url: clientProvidedThumbnail,
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const linkPostWithMetadata =
    await api.functional.communityPlatform.member.posts.create(memberConn, {
      body: linkPostWithMetadataBody,
    });
  typia.assert(linkPostWithMetadata);

  // Step 6: Verify link post with client-provided metadata
  TestValidator.equals(
    "post type is link",
    linkPostWithMetadata.post_type,
    "link",
  );
  TestValidator.equals(
    "content_text is null",
    linkPostWithMetadata.content_text,
    null,
  );
  TestValidator.equals(
    "content_link_url matches",
    linkPostWithMetadata.content_link_url,
    linkUrl,
  );
  TestValidator.equals(
    "link title matches provided",
    linkPostWithMetadata.content_link_title,
    clientProvidedTitle,
  );
  TestValidator.equals(
    "link description matches provided",
    linkPostWithMetadata.content_link_description,
    clientProvidedDescription,
  );
  TestValidator.equals(
    "link thumbnail matches provided",
    linkPostWithMetadata.content_link_thumbnail_url,
    clientProvidedThumbnail,
  );

  // Step 7: Verify engagement metrics initialize to zero
  TestValidator.equals(
    "vote_score initialized to zero",
    linkPostWithMetadata.vote_score,
    0,
  );
  TestValidator.equals(
    "upvote_count initialized to zero",
    linkPostWithMetadata.upvote_count,
    0,
  );
  TestValidator.equals(
    "downvote_count initialized to zero",
    linkPostWithMetadata.downvote_count,
    0,
  );
  TestValidator.equals(
    "comment_count initialized to zero",
    linkPostWithMetadata.comment_count,
    0,
  );

  // Step 8: Create link post with only URL (auto-extract metadata)
  const autoExtractLinkUrl = "https://example.com/auto-extract";
  const linkPostAutoExtractBody = {
    community_id: community.id,
    post_type: "link",
    title: RandomGenerator.name(),
    content_link_url: autoExtractLinkUrl,
    is_nsfw: false,
    has_spoiler: false,
  } satisfies ICommunityPlatformPost.ICreate;

  const linkPostAutoExtract =
    await api.functional.communityPlatform.member.posts.create(memberConn, {
      body: linkPostAutoExtractBody,
    });
  typia.assert(linkPostAutoExtract);

  // Step 9: Verify auto-extracted link post
  TestValidator.equals(
    "auto-extract post type is link",
    linkPostAutoExtract.post_type,
    "link",
  );
  TestValidator.equals(
    "auto-extract content_text is null",
    linkPostAutoExtract.content_text,
    null,
  );
  TestValidator.equals(
    "auto-extract content_link_url matches",
    linkPostAutoExtract.content_link_url,
    autoExtractLinkUrl,
  );
  TestValidator.equals(
    "auto-extract vote_score initialized",
    linkPostAutoExtract.vote_score,
    0,
  );
  TestValidator.equals(
    "auto-extract upvote_count initialized",
    linkPostAutoExtract.upvote_count,
    0,
  );
  TestValidator.equals(
    "auto-extract downvote_count initialized",
    linkPostAutoExtract.downvote_count,
    0,
  );
  TestValidator.equals(
    "auto-extract comment_count initialized",
    linkPostAutoExtract.comment_count,
    0,
  );

  // Step 10: Verify visibility and timestamp fields
  TestValidator.equals(
    "link post visibility is public",
    linkPostWithMetadata.visibility_status,
    "public",
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    typeof linkPostWithMetadata.created_at === "string" &&
      linkPostWithMetadata.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    typeof linkPostWithMetadata.updated_at === "string" &&
      linkPostWithMetadata.updated_at.length > 0,
  );
  TestValidator.equals(
    "deleted_at is null for active post",
    linkPostWithMetadata.deleted_at,
    null,
  );
}
