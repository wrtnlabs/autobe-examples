import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsPostMedia } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostMedia";
import type { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";

/**
 * Test: Member creates a post with uploaded media attached.
 *
 * Business context:
 *
 * - A community member signs up and receives authorization tokens.
 * - The member creates a community with a per-community media limit.
 * - The member uploads media (presigned/URL flow) and obtains media ids.
 * - The member creates an image post attaching previously uploaded media ids.
 *
 * This test validates:
 *
 * - Upload flow returns media metadata with moderation defaults
 * - Post creation associates media with the created post
 * - Moderation metadata and community limits are respected
 */
export async function test_api_post_creation_with_media_by_member(
  connection: api.IConnection,
) {
  // 1) Register & authenticate a new community member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(8).toLowerCase();
  const memberPassword = "Passw0rd!"; // Meets min length and complexity

  const joinResponse = await api.functional.auth.communityMember.join(
    connection,
    {
      body: {
        email: memberEmail,
        username: memberUsername,
        password: memberPassword,
        session_context: {
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: null,
          session_ttl_seconds: null,
        },
      } satisfies ICommunityBbsCommunityMember.ICreate,
    },
  );
  const authorized =
    typia.assert<ICommunityBbsCommunityMember.IAuthorized>(joinResponse);
  typia.assert<IAuthorizationToken>(authorized.token);
  typia.assert<ICommunityBbsCommunityMember.ISummary>(authorized.member);

  // 2) Create a community as the authenticated member
  const uniqueSuffix = Date.now().toString();
  const communitySlug = `test-community-${uniqueSuffix}`;
  const communityBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    slug: communitySlug,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    visibility: "public",
    post_approval_required: false,
    settings: {
      visibility: "public",
      require_post_approval: false,
      max_images_per_post: 3,
      allowed_image_mime_types: ["image/png", "image/jpeg"],
    } satisfies ICommunityBbsCommunity.ISettings.ICreate,
  } satisfies ICommunityBbsCommunity.ICreate;

  const createdCommunity =
    await api.functional.communityBbs.communityMember.communities.create(
      connection,
      { body: communityBody },
    );
  const community = typia.assert<ICommunityBbsCommunity>(createdCommunity);

  // 3) Upload media (use upload_mode 'url' variant)
  const uploadBody = {
    upload_mode: "url",
    url: typia.random<string & tags.Format<"uri">>(),
    media_type: "image/png",
    size_bytes: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024>
    >(),
    ordering: 0,
    community_bbs_post_id: null,
  } satisfies ICommunityBbsPostMedia.ICreate;

  const uploaded =
    await api.functional.communityBbs.communityMember.uploads.create(
      connection,
      { body: uploadBody },
    );
  const uploadedMedia = typia.assert<ICommunityBbsPostMedia>(uploaded);

  // Safety check: ensure uploadedMedia.id exists
  TestValidator.predicate(
    "uploaded media has id",
    typeof uploadedMedia.id === "string" && uploadedMedia.id.length > 0,
  );

  // 4) Create a post attaching the uploaded media
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    body: RandomGenerator.content({ paragraphs: 1 }),
    post_type: "image",
    media_ids: [uploadedMedia.id],
  } satisfies ICommunityBbsPost.ICreate;

  const created =
    await api.functional.communityBbs.communityMember.communities.posts.create(
      connection,
      {
        communitySlug: community.slug,
        body: postCreateBody,
      },
    );
  const createdPost = typia.assert<ICommunityBbsPost>(created);

  // 5) Business validations
  // Ensure post references the correct community
  TestValidator.equals(
    "post belongs to created community",
    createdPost.community.slug,
    community.slug,
  );

  // Ensure media array is present and references uploaded media
  const mediaArray = createdPost.media ?? [];
  TestValidator.predicate("post has attached media", mediaArray.length === 1);
  TestValidator.equals(
    "attached media id matches uploaded media",
    mediaArray[0].id,
    uploadedMedia.id,
  );
  TestValidator.equals(
    "attached media URL matches uploaded url",
    mediaArray[0].url,
    uploadedMedia.url,
  );
  TestValidator.equals(
    "attached media type matches uploaded type",
    mediaArray[0].media_type,
    uploadedMedia.media_type,
  );

  // Moderation metadata checks (default behavior: pending/approved/rejected)
  TestValidator.predicate(
    "attached media has moderation_status",
    mediaArray[0].moderation_status === "pending" ||
      mediaArray[0].moderation_status === "approved" ||
      mediaArray[0].moderation_status === "rejected",
  );
  TestValidator.predicate(
    "attached media has created_at",
    typeof mediaArray[0].created_at === "string",
  );

  // Community-specific limits: if max_images_per_post available, ensure the post does not exceed it
  if (
    community.community_settings &&
    community.community_settings.max_images_per_post !== null &&
    community.community_settings.max_images_per_post !== undefined
  ) {
    TestValidator.predicate(
      "media count within community limit",
      mediaArray.length <=
        (community.community_settings.max_images_per_post as number),
    );
  }
}
