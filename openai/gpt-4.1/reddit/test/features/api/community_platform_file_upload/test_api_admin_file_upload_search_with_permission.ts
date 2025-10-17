import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileUpload";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformFileUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformFileUpload";

/**
 * Test for admin file upload search with permission control and full filtering.
 *
 * This test checks the following:
 *
 * 1. Admin user can properly authenticate
 * 2. Member user can register and upload a file (simulates file upload with all
 *    required fields)
 * 3. Admin can search for file upload records and find the member's uploaded file
 * 4. All returned file upload summaries contain expected metadata fields (id,
 *    uploaded_by_member_id, original_filename, etc.)
 * 5. Various filters are tested: by member, by status, by mime_type, by
 *    original_filename, and using pagination
 * 6. Confirm admin can see uploaded files (status = 'active'), and test a negative
 *    filter (status = 'deleted') returns empty unless soft deletion is
 *    simulated/available
 * 7. Attempt unauthorized search as a regular member and as an unauthenticated
 *    user, expecting errors/denied responses
 *
 * Stepwise implementation: a. Register admin, authorize b. Register member,
 * authorize c. Upload file as member, capture upload data d. Search as admin
 * (various filters, all with assert checks) e. Attempt search as unauthorized
 * user (should throw error)
 */
export async function test_api_admin_file_upload_search_with_permission(
  connection: api.IConnection,
) {
  // Register admin with random email/password
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: false,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);
  // Save admin token for later
  const adminToken = admin.token.access;

  // Register member with random email/password
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  const memberToken = member.token.access;

  // Member uploads a file
  // Switch connection to use member's token
  const memberConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: memberToken },
  };
  const fileToUpload = {
    uploaded_by_member_id: member.id,
    original_filename: RandomGenerator.name(2) + ".jpg",
    storage_key: RandomGenerator.alphaNumeric(24),
    mime_type: "image/jpeg",
    file_size_bytes: 2048,
    url: "https://dummy-storage-url.com/" + RandomGenerator.alphaNumeric(16),
    status: "active",
  } satisfies ICommunityPlatformFileUpload.ICreate;
  const uploadedFile =
    await api.functional.communityPlatform.member.fileUploads.create(
      memberConnection,
      {
        body: fileToUpload,
      },
    );
  typia.assert(uploadedFile);

  // Switch back to admin for all searches
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: adminToken },
  };

  // 1. Search with no filters (should include uploaded file)
  const allFiles =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: {} },
    );
  typia.assert(allFiles);
  TestValidator.predicate(
    "admin gets at least one file",
    allFiles.data.length > 0,
  );
  const found = allFiles.data.find((f) => f.id === uploadedFile.id);
  TestValidator.predicate("uploaded file is in admin results", !!found);
  if (found) {
    TestValidator.equals(
      "uploader id matches member",
      found.uploaded_by_member_id,
      member.id,
    );
    TestValidator.equals(
      "filename matches",
      found.original_filename,
      fileToUpload.original_filename,
    );
    TestValidator.equals(
      "mime type matches",
      found.mime_type,
      fileToUpload.mime_type,
    );
    TestValidator.equals("status matches", found.status, "active");
    TestValidator.equals(
      "file size matches",
      found.file_size_bytes,
      fileToUpload.file_size_bytes,
    );
    TestValidator.equals("url matches", found.url, fileToUpload.url);
    TestValidator.predicate("created_at is present", !!found.created_at);
    TestValidator.predicate("updated_at is present", !!found.updated_at);
  }

  // 2. Filter by uploader/member id
  const filesByMember =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: { uploaded_by_member_id: member.id } },
    );
  typia.assert(filesByMember);
  TestValidator.predicate(
    "filter by member yields file(s)",
    filesByMember.data.some((f) => f.id === uploadedFile.id),
  );

  // 3. Filter by status 'active'
  const filesActive =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: { status: "active" } },
    );
  typia.assert(filesActive);
  TestValidator.predicate(
    "active status filter shows file",
    filesActive.data.some((f) => f.id === uploadedFile.id),
  );

  // 4. Filter by status 'deleted' should not show our file unless deleted (negative test)
  const filesDeleted =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: { status: "deleted" } },
    );
  typia.assert(filesDeleted);
  TestValidator.predicate(
    "deleted status filter is empty or does not show file",
    filesDeleted.data.every((f) => f.id !== uploadedFile.id),
  );

  // 5. Filter by original_filename
  const filesByName =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: { original_filename: fileToUpload.original_filename } },
    );
  typia.assert(filesByName);
  TestValidator.predicate(
    "filter by filename yields file(s)",
    filesByName.data.some((f) => f.id === uploadedFile.id),
  );

  // 6. Filter by mime_type
  const filesByMime =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: { mime_type: fileToUpload.mime_type } },
    );
  typia.assert(filesByMime);
  TestValidator.predicate(
    "filter by mime_type yields file(s)",
    filesByMime.data.some((f) => f.id === uploadedFile.id),
  );

  // 7. Pagination (limit/page)
  const pagedFiles =
    await api.functional.communityPlatform.admin.fileUploads.index(
      adminConnection,
      { body: { page: 1, limit: 1 } },
    );
  typia.assert(pagedFiles);
  TestValidator.predicate(
    "pagination returns at least one record",
    pagedFiles.data.length >= 1,
  );

  // 8. Negative Test: as member user, should not be able to search
  const unauthorizedConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: memberToken },
  };
  await TestValidator.error(
    "member cannot access admin file upload search",
    async () => {
      await api.functional.communityPlatform.admin.fileUploads.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );

  // 9. Negative Test: unauthenticated/no token cannot search
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin file upload search",
    async () => {
      await api.functional.communityPlatform.admin.fileUploads.index(
        unauthConn,
        { body: {} },
      );
    },
  );
}
