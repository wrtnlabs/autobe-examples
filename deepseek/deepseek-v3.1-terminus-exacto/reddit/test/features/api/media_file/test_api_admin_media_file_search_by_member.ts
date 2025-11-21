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
 * Test media file search filtering by specific uploader member.
 *
 * Validates that administrators can filter media files by member ID to view
 * files uploaded by specific community members. Tests that the member_id filter
 * correctly restricts results to files uploaded by the specified member only,
 * and that combining member filtering with other criteria works properly.
 */
export async function test_api_admin_media_file_search_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for media file search operations
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!" satisfies string &
          tags.Format<"password">,
        display_name: RandomGenerator.name(),
        admin_level: "content",
        is_super_admin: false,
      } satisfies ICommunityPlatformAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create multiple member accounts to test filtering
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        password: "Member1Pass123!" satisfies string & tags.MinLength<8>,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        password: "Member2Pass123!" satisfies string & tags.MinLength<8>,
        display_name: RandomGenerator.name(),
        href: "https://example.com/register" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Step 3: Switch to member1 and upload test media files
  await api.functional.auth.member.login(connection, {
    body: {
      email: member1Email,
      password: "Member1Pass123!",
      href: "https://example.com/upload" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const member1Files: ICommunityPlatformMediaFile[] = [];
  for (let i = 0; i < 3; i++) {
    const file =
      await api.functional.communityPlatform.member.mediaFiles.create(
        connection,
        {
          body: {
            file_name: `member1_file_${i}.jpg`,
            file_type: "image/jpeg",
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            storage_path: `/uploads/member1/file_${i}.jpg`,
            optimization_level: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies ICommunityPlatformMediaFile.ICreate,
        },
      );
    typia.assert(file);
    member1Files.push(file);
  }

  // Step 4: Switch to member2 and upload test media files
  await api.functional.auth.member.login(connection, {
    body: {
      email: member2Email,
      password: "Member2Pass123!",
      href: "https://example.com/upload" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const member2Files: ICommunityPlatformMediaFile[] = [];
  for (let i = 0; i < 2; i++) {
    const file =
      await api.functional.communityPlatform.member.mediaFiles.create(
        connection,
        {
          body: {
            file_name: `member2_file_${i}.png`,
            file_type: "image/png",
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            storage_path: `/uploads/member2/file_${i}.png`,
            optimization_level: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
            >(),
          } satisfies ICommunityPlatformMediaFile.ICreate,
        },
      );
    typia.assert(file);
    member2Files.push(file);
  }

  // Step 5: Switch back to admin and test member filtering
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPassword123!",
      ip: null,
      href: "https://example.com/admin" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      session_id: typia.random<string>(),
      user_agent: "TestAgent/1.0",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });

  // Test 1: Filter by member1 - should return only member1's files
  const member1Search: IPageICommunityPlatformMediaFile.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        member_id: member1.id satisfies string & tags.Format<"uuid">,
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 10 satisfies number & tags.Type<"int32">,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(member1Search);

  TestValidator.equals(
    "member1 search returns correct number of files",
    member1Search.data.length,
    3,
  );
  TestValidator.predicate(
    "member1 search returns only member1's files",
    member1Search.data.every((file) =>
      member1Files.some((m1File) => m1File.id === file.id),
    ),
  );

  // Test 2: Filter by member2 - should return only member2's files
  const member2Search: IPageICommunityPlatformMediaFile.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        member_id: member2.id satisfies string & tags.Format<"uuid">,
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 10 satisfies number & tags.Type<"int32">,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(member2Search);

  TestValidator.equals(
    "member2 search returns correct number of files",
    member2Search.data.length,
    2,
  );
  TestValidator.predicate(
    "member2 search returns only member2's files",
    member2Search.data.every((file) =>
      member2Files.some((m2File) => m2File.id === file.id),
    ),
  );

  // Test 3: Combine member filtering with file type search
  const member1JpegSearch: IPageICommunityPlatformMediaFile.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        member_id: member1.id satisfies string & tags.Format<"uuid">,
        file_type: "image/jpeg",
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 10 satisfies number & tags.Type<"int32">,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(member1JpegSearch);

  TestValidator.predicate(
    "member1 jpeg search returns correct files",
    member1JpegSearch.data.every(
      (file) =>
        file.file_type === "image/jpeg" &&
        member1Files.some((m1File) => m1File.id === file.id),
    ),
  );

  // Test 4: Search with non-existent member ID - should return empty results
  const nonExistentMemberSearch: IPageICommunityPlatformMediaFile.ISummary =
    await api.functional.communityPlatform.admin.mediaFiles.index(connection, {
      body: {
        member_id: typia.random<string & tags.Format<"uuid">>(),
        page: 1 satisfies number & tags.Type<"int32">,
        limit: 10 satisfies number & tags.Type<"int32">,
      } satisfies ICommunityPlatformMediaFile.IRequest,
    });
  typia.assert(nonExistentMemberSearch);

  TestValidator.equals(
    "non-existent member search returns empty results",
    nonExistentMemberSearch.data.length,
    0,
  );

  // Test 5: Verify pagination metadata reflects filtered results
  TestValidator.equals(
    "member1 search pagination shows correct total records",
    member1Search.pagination.records,
    3,
  );
  TestValidator.equals(
    "member2 search pagination shows correct total records",
    member2Search.pagination.records,
    2,
  );
}
