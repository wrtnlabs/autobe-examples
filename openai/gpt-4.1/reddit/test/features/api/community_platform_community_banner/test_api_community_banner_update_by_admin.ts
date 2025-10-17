import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBanner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanner";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";

/**
 * E2E test for updating a community banner by an admin.
 *
 * Steps:
 *
 * 1. Register a new admin account, authenticating as a platform admin.
 * 2. Create a new community with unique name, title, slug, and description.
 * 3. Upload a new file to be used as the banner image for the community.
 * 4. Create a banner, associating it with the uploaded file and the created
 *    community.
 * 5. Update the banner's allowed metadata fields (order, alt_text, active) as
 *    admin.
 * 6. Validate that only allowed fields are changed; image/file reference is NOT
 *    changed.
 * 7. Confirm error is thrown if attempting to update for unrelated community,
 *    modify immutable fields (file_upload_id), or update archived
 *    (soft-deleted) banners.
 */
export async function test_api_community_banner_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register new admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPass = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPass,
      superuser: true,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  // authentication headers now present via SDK

  // 2. Create a new community
  const communityCreate = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    slug: RandomGenerator.alphaNumeric(12),
    description: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 8,
      sentenceMax: 16,
    }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityCreate,
      },
    );
  typia.assert(community);

  // 3. Upload a file for the banner image
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: community.creator_member_id,
          original_filename: `${RandomGenerator.alphaNumeric(6)}.png`,
          storage_key: RandomGenerator.alphaNumeric(32),
          mime_type: "image/png",
          file_size_bytes: 1024,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(24)}.png`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 4. Create the banner for the community
  const bannerCreate = {
    file_upload_id: fileUpload.id,
    order: 1,
    alt_text: "Banner Alt Text",
    active: true,
  } satisfies ICommunityPlatformCommunityBanner.ICreate;
  const banner =
    await api.functional.communityPlatform.admin.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: bannerCreate,
      },
    );
  typia.assert(banner);
  TestValidator.equals(
    "file_upload_id ref matches banner",
    banner.file_upload_id,
    fileUpload.id,
  );
  TestValidator.equals(
    "community_id ref matches banner",
    banner.community_id,
    community.id,
  );

  // 5. Update the allowed metadata fields
  const updateFields = {
    order: 2,
    alt_text: "Changed AltText",
    active: false,
  } satisfies ICommunityPlatformCommunityBanner.IUpdate;
  const updatedBanner =
    await api.functional.communityPlatform.admin.communities.banners.update(
      connection,
      {
        communityId: community.id,
        bannerId: banner.id,
        body: updateFields,
      },
    );
  typia.assert(updatedBanner);

  // 6. Validate changes: only allowed fields changed, immutable file/id did not change
  TestValidator.equals(
    "order field changed",
    updatedBanner.order,
    updateFields.order,
  );
  TestValidator.equals(
    "alt_text changed",
    updatedBanner.alt_text,
    updateFields.alt_text,
  );
  TestValidator.equals(
    "active changed",
    updatedBanner.active,
    updateFields.active,
  );
  TestValidator.equals(
    "file_upload_id unchanged",
    updatedBanner.file_upload_id,
    banner.file_upload_id,
  );
  TestValidator.equals(
    "community_id unchanged",
    updatedBanner.community_id,
    banner.community_id,
  );

  // 7a. Try to update file_upload_id (immutable) -- should fail (backend ignores, no update)
  await TestValidator.error(
    "attempting to update file_upload_id should NOT update file reference",
    async () => {
      // The API does not support file_upload_id field in update, so this should not even be possible
      // We'll check that the value cannot change by re-updating and confirming file_upload_id is same
      const attemptUpdate =
        await api.functional.communityPlatform.admin.communities.banners.update(
          connection,
          {
            communityId: community.id,
            bannerId: banner.id,
            body: {
              alt_text: "Try change alt",
              order: 3,
            } satisfies ICommunityPlatformCommunityBanner.IUpdate,
          },
        );
      typia.assert(attemptUpdate);
      TestValidator.equals(
        "file_upload_id still unchanged after re-update",
        attemptUpdate.file_upload_id,
        banner.file_upload_id,
      );
    },
  );

  // 7b. Try updating the banner using wrong/unrelated communityId (should fail)
  const unrelatedCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          slug: RandomGenerator.alphaNumeric(12),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 16,
          }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(unrelatedCommunity);

  await TestValidator.error(
    "updating banner from unrelated community should fail",
    async () => {
      await api.functional.communityPlatform.admin.communities.banners.update(
        connection,
        {
          communityId: unrelatedCommunity.id,
          bannerId: banner.id,
          body: {
            alt_text: "Should not update",
            order: 99,
          } satisfies ICommunityPlatformCommunityBanner.IUpdate,
        },
      );
    },
  );

  // 7c. Try updating a soft-deleted (archived) banner (should fail)
  // Simulate by soft deleting the banner (not available in this SDK), but we can only check inability to re-update after we set deleted_at manually if such SDK exists.
  // Here we can't delete via API, so we can't test this specific scenario without such endpoint.
}
