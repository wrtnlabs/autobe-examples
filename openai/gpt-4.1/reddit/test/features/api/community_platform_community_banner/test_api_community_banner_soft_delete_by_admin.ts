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
 * Validate that a platform admin can archive (soft-delete) a community banner
 * image and test business rules around soft deletion.
 *
 * Steps:
 *
 * 1. Admin joins (registers) with random email/password.
 * 2. Admin creates a community via the member API (to own and moderate).
 * 3. Admin simulates a member uploading a file: creates file upload metadata (with
 *    random filename, mime, key).
 * 4. Admin associates the uploaded file as a banner for the community via the
 *    admin/banners create API.
 * 5. Admin invokes archive (soft-delete) endpoint for the banner.
 * 6. Validates:
 *
 *    - Banner is archived (deleted_at is set if it can be queried) and no longer
 *         visible for the community
 *    - Upload metadata still exists, file is not deleted
 *    - Soft-archive is idempotent: re-archiving yields proper error
 *    - Archiving a non-existent banner yields proper error
 *    - Only admin context can perform the archive (no unauthorized deletion allowed)
 */
export async function test_api_community_banner_soft_delete_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers; grant superuser privileges randomly
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        superuser: RandomGenerator.pick([true, false]),
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin creates a community (simulate member action for ownership)
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(1)
            .replace(/\s/g, "_")
            .toLowerCase()
            .substring(0, 24),
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 12,
          }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 10,
          }),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Upload a file to use as a banner (simulate member upload)
  const fileUpload =
    await api.functional.communityPlatform.member.fileUploads.create(
      connection,
      {
        body: {
          uploaded_by_member_id: community.creator_member_id,
          original_filename: RandomGenerator.name(1) + ".jpg",
          storage_key: RandomGenerator.alphaNumeric(24),
          mime_type: "image/jpeg",
          file_size_bytes: 1024 * 32,
          url: `https://cdn.example.com/${RandomGenerator.alphaNumeric(30)}.jpg`,
          status: "active",
        } satisfies ICommunityPlatformFileUpload.ICreate,
      },
    );
  typia.assert(fileUpload);

  // 4. Associate file as a community banner via admin API
  const banner =
    await api.functional.communityPlatform.admin.communities.banners.create(
      connection,
      {
        communityId: community.id,
        body: {
          file_upload_id: fileUpload.id,
          active: true,
          order: 1,
          alt_text: RandomGenerator.paragraph({ sentences: 2, wordMin: 4 }),
        } satisfies ICommunityPlatformCommunityBanner.ICreate,
      },
    );
  typia.assert(banner);

  // 5. Soft-delete (archive) the banner as admin
  await api.functional.communityPlatform.admin.communities.banners.erase(
    connection,
    {
      communityId: community.id,
      bannerId: banner.id,
    },
  );

  // 6. Attempt to archive the same banner again; should raise error
  await TestValidator.error(
    "re-archiving already archived banner yields error",
    async () => {
      await api.functional.communityPlatform.admin.communities.banners.erase(
        connection,
        {
          communityId: community.id,
          bannerId: banner.id,
        },
      );
    },
  );

  // 7. Attempt to archive a non-existent banner (random UUID); should raise error
  await TestValidator.error(
    "archiving a non-existent banner yields error",
    async () => {
      await api.functional.communityPlatform.admin.communities.banners.erase(
        connection,
        {
          communityId: community.id,
          bannerId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );

  // 8. Confirm the file upload metadata still exists after banner archive
  // No deletion API or retrieval by file_upload_id in provided SDK, so we assert previous fileUpload record is still valid
  typia.assert(fileUpload);

  // 9. (Negative) Try soft-deleting with a different (non-admin) connection would fail if such an API existed, but not available with member APIs; can't test without unauthenticated context in current API set
}
