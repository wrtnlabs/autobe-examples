import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMediaFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformMediaFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformMediaFile";

/**
 * Test media file search functionality for administrators. This test validates
 * that administrators can search and filter media files using the available
 * search parameters. Since media file status is managed by backend processing
 * workflows and cannot be manually controlled through the API, this test
 * focuses on verifying the search functionality with the actual statuses that
 * files have after creation.
 */
export async function test_api_admin_media_file_search_by_status(
  connection: api.IConnection,
) {
  // Create admin account for media file search operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Create member account to upload test media files
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPassword123!",
        display_name: RandomGenerator.name(),
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Upload multiple media files - they will have initial "uploaded" status
  const mediaFiles: ICommunityPlatformMediaFile[] = [];
  const fileCount = 4;

  for (let i = 0; i < fileCount; i++) {
    const mediaFile =
      await api.functional.communityPlatform.member.mediaFiles.create(
        connection,
        {
          body: {
            file_name: `test_file_${i}.jpg`,
            file_type: "image/jpeg",
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            storage_path: `/uploads/${typia.random<string & tags.Format<"uuid">>()}.jpg`,
            optimization_level: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies ICommunityPlatformMediaFile.ICreate,
        },
      );
    typia.assert(mediaFile);
    mediaFiles.push(mediaFile);
  }

  // Switch to admin authentication
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: "192.168.1.1",
      href: "https://example.com/admin",
      referrer: "https://example.com",
      session_id: typia.random<string & tags.Format<"uuid">>(),
      user_agent: "Test Agent",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Test search with file type filter
  const jpegSearchResult =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        file_type: "image/jpeg",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(jpegSearchResult);

  TestValidator.predicate(
    "search by file type should return matching files",
    jpegSearchResult.data.length > 0,
  );

  for (const file of jpegSearchResult.data) {
    TestValidator.equals(
      "file type should match search filter",
      file.file_type,
      "image/jpeg",
    );
  }

  // Test search with file name pattern
  const nameSearchResult =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        search: "test_file",
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(nameSearchResult);

  TestValidator.predicate(
    "search by file name pattern should return matching files",
    nameSearchResult.data.length > 0,
  );

  // Test search without filters (should return all files)
  const allFilesResult =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        page: 1,
        limit: 50,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(allFilesResult);

  TestValidator.predicate(
    "search without filters should return multiple files",
    allFilesResult.data.length >= fileCount,
  );

  // Validate pagination information for all searches
  const searchResults = [jpegSearchResult, nameSearchResult, allFilesResult];

  for (const result of searchResults) {
    TestValidator.predicate(
      "pagination should be valid",
      result.pagination.current === 1 &&
        result.pagination.limit === (result === allFilesResult ? 50 : 10) &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
  }

  // Test that files have valid statuses (even though we can't control them)
  const statusSearchResult =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        status: "uploaded", // This is the initial status for newly created files
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(statusSearchResult);

  // Files should have valid status values from the allowed set
  const validStatuses = [
    "uploaded",
    "processing",
    "optimized",
    "failed",
  ] as const;

  for (const file of statusSearchResult.data) {
    TestValidator.predicate(
      "file status should be one of the valid status values",
      validStatuses.includes(file.status as (typeof validStatuses)[number]),
    );
  }
}
