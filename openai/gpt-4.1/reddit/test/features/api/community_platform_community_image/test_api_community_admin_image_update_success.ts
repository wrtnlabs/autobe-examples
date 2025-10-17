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
 * Update a community image's metadata as an admin and verify changes are
 * correctly applied.
 *
 * 1. Register as a new admin
 * 2. Create a community as a member (title, name, description, slug)
 * 3. Upload a file as a member (must provide member UUID as uploader)
 * 4. As admin, create a community image record for the community referencing the
 *    uploaded file
 * 5. As admin, update the community image's metadata (change alt_text, image_type,
 *    order, active)
 * 6. Assert that the returned community image reflects the update (alt_text, type,
 *    order, active are updated, static fields are unchanged)
 */
export async function test_api_community_admin_image_update_success(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: "P@ssw0rd!42",
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(adminJoin);
  // Admin registration sets token for subsequent admin requests

  // 2. Create community as a member: Use admin ID as the creator_member_id
  const communityCreate =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
            sentenceMax: 20,
            wordMin: 4,
            wordMax: 12,
          }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityCreate);
  const communityId = communityCreate.id;

  // 3. Upload a file as a (fake) member for image reference
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: communityCreate.creator_member_id,
          original_filename: RandomGenerator.alphaNumeric(8) + ".png",
          storage_key: RandomGenerator.alphaNumeric(32),
          mime_type: "image/png",
          file_size_bytes: typia.random<
            number &
              tags.Type<"int32"> &
              tags.Minimum<1000> &
              tags.Maximum<2000000>
          >(),
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(12)}.png`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);
  const fileUploadId = fileUpload.id;

  // 4. As admin, create a community image referencing file
  const imageTypeOriginal = RandomGenerator.pick([
    "icon",
    "background",
    "secondary",
  ] as const);
  const communityImage =
    await api.functional.communityPlatform.admin.communities.images.create(
      connection,
      {
        communityId,
        body: {
          file_upload_id: fileUploadId,
          image_type: imageTypeOriginal,
          order: 1,
          alt_text: "Original image alt text",
          active: true,
        } satisfies ICommunityPlatformCommunityImage.ICreate,
      },
    );
  typia.assert(communityImage);

  // 5. Prepare update payload
  const imageTypeUpdate = RandomGenerator.pick([
    "background",
    "icon",
    "banner",
  ] as const); // different type
  const updatePayload = {
    image_type: imageTypeUpdate,
    order: 42, // Change the order
    alt_text: `Updated alt text ${RandomGenerator.alphaNumeric(6)}`,
    active: false,
  } satisfies ICommunityPlatformCommunityImage.IUpdate;

  // 6. As admin, update the image metadata
  const updatedImage =
    await api.functional.communityPlatform.admin.communities.images.update(
      connection,
      {
        communityId,
        imageId: communityImage.id,
        body: updatePayload,
      },
    );
  typia.assert(updatedImage);
  // All updated fields should match, non-updated fields static
  TestValidator.equals(
    "image id should remain unchanged",
    updatedImage.id,
    communityImage.id,
  );
  TestValidator.equals(
    "community id should remain unchanged",
    updatedImage.community_id,
    communityId,
  );
  TestValidator.equals(
    "file upload id should remain unchanged",
    updatedImage.file_upload_id,
    fileUploadId,
  );
  TestValidator.equals(
    "image_type updated",
    updatedImage.image_type,
    imageTypeUpdate,
  );
  TestValidator.equals("order updated", updatedImage.order, 42);
  TestValidator.equals(
    "alt_text updated",
    updatedImage.alt_text,
    updatePayload.alt_text,
  );
  TestValidator.equals("active updated", updatedImage.active, false);
}
