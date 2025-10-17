import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";

/**
 * Tests permanent removal of a non-banner community image by admin, enforcing
 * privilege checks and physical unlinking from the community.
 *
 * 1. Register a new admin using a random but valid email and password via POST
 *    /auth/admin/join.
 * 2. Admin creates a community by calling POST
 *    /communityPlatform/member/communities with valid
 *    name/title/slug/description.
 * 3. Simulate an authenticated member uploading a file asset (e.g., a PNG icon)
 *    for use as a community image via POST
 *    /communityPlatform/member/fileUploads, using the admin's member_id as the
 *    uploader for simplicity.
 * 4. As admin, associate the uploaded file as an image (not banner, e.g., 'icon')
 *    for the community with POST
 *    /communityPlatform/admin/communities/{communityId}/images. Choose 'icon'
 *    or 'background' for image_type and appropriate alt_text.
 * 5. As admin, DELETE the created image using
 *    /communityPlatform/admin/communities/{communityId}/images/{imageId}.
 * 6. Optionally, (if image listing endpoint existed) retrieve community images to
 *    confirm the deleted image is no longer present.
 *
 * Negative/edge cases: (a) Attempt deleting with wrong communityId or imageId;
 * (b) try deleting as a non-admin (out of scope if there is no member DELETE
 * endpoint); (c) deleting with a valid imageId but not associated with the
 * community; (d) deleting an already-deleted or non-existent image; (e)
 * business rules for underlying file (do not expect actual file deletion).
 */
export async function test_api_community_image_removal_by_admin(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 2. Create a community
  const communityBody = {
    name: RandomGenerator.alphabets(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 6,
      sentenceMax: 10,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Upload a file asset for use as community image
  const fileUploadBody = {
    uploaded_by_member_id: admin.id as string & tags.Format<"uuid">,
    original_filename: RandomGenerator.alphabets(10) + ".png",
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/png",
    file_size_bytes: 1024,
    url: `https://files.example.com/${RandomGenerator.alphaNumeric(16)}.png`,
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      { body: fileUploadBody },
    );
  typia.assert(fileUpload);

  // 4. Associate the file as a community image (type: icon)
  const imageBody = {
    file_upload_id: fileUpload.id,
    image_type: "icon",
    active: true,
    alt_text: RandomGenerator.paragraph({ sentences: 2 }),
    order: 1,
  } satisfies ICommunityPlatformCommunityImage.ICreate;
  const image =
    await api.functional.communityPlatform.admin.communities.images.create(
      connection,
      {
        communityId: community.id,
        body: imageBody,
      },
    );
  typia.assert(image);

  // 5. Delete the community image by admin
  await api.functional.communityPlatform.admin.communities.images.erase(
    connection,
    {
      communityId: community.id,
      imageId: image.id,
    },
  );

  // 6. Validate the image is no longer retrievable in the community image list (if listing was available).
  // (No read/listing endpoint is provided, so this check is omitted)

  // Negative tests: try to delete with non-existent imageId, wrong communityId, or image already deleted.
  await TestValidator.error("deleting with wrong imageId fails", async () => {
    await api.functional.communityPlatform.admin.communities.images.erase(
      connection,
      {
        communityId: community.id,
        imageId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  await TestValidator.error(
    "deleting with wrong communityId fails",
    async () => {
      await api.functional.communityPlatform.admin.communities.images.erase(
        connection,
        {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          imageId: image.id,
        },
      );
    },
  );
  await TestValidator.error(
    "deleting already-deleted image fails",
    async () => {
      await api.functional.communityPlatform.admin.communities.images.erase(
        connection,
        {
          communityId: community.id,
          imageId: image.id,
        },
      );
    },
  );
}
