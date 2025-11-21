import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaThumbnail";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMediaThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMediaThumbnail";

/**
 * Test that administrators can retrieve comprehensive thumbnail lists for any
 * media file across the platform. Validates administrative access privileges by
 * ensuring admins can view thumbnails for media files uploaded by different
 * users. Tests advanced filtering capabilities including search by storage
 * path, dimension-based filtering, and quality range selection, verifying that
 * admin-level access provides complete thumbnail management visibility.
 */
export async function test_api_media_thumbnail_listing_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123456";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
        display_name: RandomGenerator.name(2),
        ip: "192.168.1.100",
        href: "https://example.com/register",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create media file as member
  const mediaFile: ICommunityPlatformMediaFile =
    await api.functional.communityPlatform.member.mediaFiles.create(
      connection,
      {
        body: {
          file_name: "test-image.jpg",
          file_type: "image/jpeg",
          file_size: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
          storage_path: "/uploads/images/test-image.jpg",
          optimization_level: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformMediaFile.ICreate,
      },
    );
  typia.assert(mediaFile);

  // Step 3: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "admin123456";

  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        display_name: RandomGenerator.name(2),
        admin_level: "super",
        is_super_admin: true,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 4: Switch to admin context and retrieve thumbnails
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: "192.168.1.200",
      href: "https://example.com/admin",
      referrer: "https://example.com/login",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Mozilla/5.0 Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Step 5: Test basic thumbnail listing
  const thumbnailsPage: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(thumbnailsPage);

  // Validate pagination structure
  TestValidator.equals(
    "pagination structure exists",
    thumbnailsPage.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "current page is 1",
    thumbnailsPage.pagination.current,
    1,
  );
  TestValidator.equals("limit is 10", thumbnailsPage.pagination.limit, 10);

  // Step 6: Test search functionality
  const searchResults: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          search: "test-image",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(searchResults);

  // Step 7: Test dimension filtering
  const dimensionResults: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          thumbnail_size: "150x150",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(dimensionResults);

  // Step 8: Test quality range filtering
  const qualityResults: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          quality_min: 50,
          quality_max: 90,
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(qualityResults);

  // Step 9: Test format filtering
  const formatResults: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          format: "JPEG",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(formatResults);

  // Step 10: Test sorting
  const sortedResults: IPageICommunityPlatformMediaThumbnail.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.thumbnails.index(
      connection,
      {
        mediaFileId: mediaFile.id,
        body: {
          order_by: "created_at",
          order: "desc",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformMediaThumbnail.IRequest,
      },
    );
  typia.assert(sortedResults);

  // Final validation: Admin can access thumbnails for member-uploaded media
  TestValidator.predicate(
    "admin can access member media thumbnails",
    thumbnailsPage.data !== undefined,
  );
}
