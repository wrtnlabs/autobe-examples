import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationFile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_files_create } from "../../../generate/generate_random_hrm_platform_member_organizations_files_create";
import { prepare_random_hrm_platform_organization_file } from "../../../prepare/prepare_random_hrm_platform_organization_file";

/**
 * Test organization files listing success scenario with filtering, sorting, and pagination.
 *
 * Validates the complete file listing workflow including member registration with initial organization,
 * file creation with various types and statuses, and comprehensive listing operations with filters,
 * sorting options, and pagination controls. Tests all key functionality including file type filtering,
 * status filtering, name search, size range filtering, date range filtering, and multiple sorting
 * combinations to ensure the API correctly handles all listing operations.
 *
 * 1. Member registration with initial organization creation.
 * 2. File creation with varied types (logo, image, document), statuses (active, archived, deleted),
 *    and metadata to enable comprehensive filtering and sorting tests.
 * 3. Primary listing verification - all files returned with correct pagination metadata.
 * 4. Filter validation - file_type, status, file_name, file_size_range, created_at_range filters.
 * 5. Sorting validation - created_at asc/desc, file_size desc, file_name asc sorting.
 * 6. Pagination validation - limit=20, limit=100, metadata consistency checks.
 */
export async function test_api_organization_files_listing_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as member to create authenticated user with initial organization
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedMember = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(joinedMember);
  // 2. Extract organization ID from sessions or member
  const organizationId =
    joinedMember.sessions?.[0]?.organization?.id ??
    (joinedMember.member as any).organization?.id ??
    typia.random<string & tags.Format<"uuid">>();
  typia.assert<string & tags.Format<"uuid">>(organizationId);
  // 3. Create test files with various types, statuses, sizes, and timestamps
  const filesToCreate: IHrmPlatformOrganizationFile.ICreate[] = [
    {
      file_key: `test/logo-${RandomGenerator.alphaNumeric(8)}.png`,
      file_name: "Company Logo",
      file_type: "logo",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<100000>
      >(),
      storage_type: "s3",
      url: typia.random<string & tags.Format<"uri">>(),
      status: "active",
    },
    {
      file_key: `test/image-${RandomGenerator.alphaNumeric(8)}.jpg`,
      file_name: "Product Image",
      file_type: "image",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<50000> & tags.Maximum<500000>
      >(),
      storage_type: "s3",
      url: typia.random<string & tags.Format<"uri">>(),
      status: "active",
    },
    {
      file_key: `test/document-${RandomGenerator.alphaNumeric(8)}.pdf`,
      file_name: "Report Document",
      file_type: "document",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<10000> & tags.Maximum<200000>
      >(),
      storage_type: "s3",
      url: typia.random<string & tags.Format<"uri">>(),
      status: "active",
    },
    {
      file_key: `test/logo-${RandomGenerator.alphaNumeric(8)}-old.png`,
      file_name: "Old Logo",
      file_type: "logo",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<5000> & tags.Maximum<50000>
      >(),
      storage_type: "s3",
      url: null,
      status: "archived",
    },
    {
      file_key: `test/image-${RandomGenerator.alphaNumeric(8)}-deleted.jpg`,
      file_name: "Deleted Image",
      file_type: "image",
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<20000> & tags.Maximum<80000>
      >(),
      storage_type: "s3",
      url: null,
      status: "deleted",
    },
  ];
  const createdFiles: IHrmPlatformOrganizationFile[] = [];
  for (const fileData of filesToCreate) {
    const createdFile =
      await generate_random_hrm_platform_member_organizations_files_create(
        { host: connection.host },
        {
          body: fileData,
          params: { organizationId },
        },
      );
    typia.assert(createdFile);
    createdFiles.push(createdFile);
  }
  // 4. Primary Success Path: List all files without filters
  const listingConnection: api.IConnection = { host: connection.host };
  const allFilesResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: {},
      },
    );
  typia.assert(allFilesResponse);
  // Verify pagination metadata
  TestValidator.equals(
    "pagination current page",
    allFilesResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is reasonable",
    allFilesResponse.pagination.limit > 0 &&
      allFilesResponse.pagination.limit <= 100,
  );
  TestValidator.equals(
    "pagination total records",
    allFilesResponse.pagination.records,
    createdFiles.length,
  );
  TestValidator.equals(
    "pagination total pages",
    allFilesResponse.pagination.pages,
    Math.ceil(createdFiles.length / allFilesResponse.pagination.limit),
  );
  // Verify all files are returned
  TestValidator.equals(
    "all files returned",
    allFilesResponse.data.length,
    createdFiles.length,
  );
  // Verify each file contains required fields
  for (const file of allFilesResponse.data) {
    typia.assert(file);
    TestValidator.predicate(
      "file has valid id",
      /^[0-9a-f-]{36}$/i.test(file.id),
    );
    TestValidator.predicate(
      "file has valid filename",
      file.file_name.length > 0,
    );
    TestValidator.predicate("file has valid type", file.file_type.length > 0);
    TestValidator.predicate("file has valid size", file.file_size > 0);
    TestValidator.predicate("file has valid status", file.status.length > 0);
    TestValidator.predicate(
      "file has valid file key",
      file.file_key.length > 0,
    );
    TestValidator.predicate(
      "file has valid organization context",
      file.organization !== undefined,
    );
  }
  // 5. Filtering Validation
  // Test file_type filter
  const logoFilesResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { file_type: ["logo"] },
      },
    );
  typia.assert(logoFilesResponse);
  TestValidator.equals(
    "file_type filter returns correct count",
    logoFilesResponse.data.length,
    createdFiles.filter((f) => f.file_type === "logo").length,
  );
  for (const file of logoFilesResponse.data) {
    TestValidator.equals("filtered files are logos", file.file_type, "logo");
  }
  // Test status filter
  const activeFilesResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { status: ["active"] },
      },
    );
  typia.assert(activeFilesResponse);
  TestValidator.equals(
    "status filter returns correct count",
    activeFilesResponse.data.length,
    createdFiles.filter((f) => f.status === "active").length,
  );
  for (const file of activeFilesResponse.data) {
    TestValidator.equals("filtered files are active", file.status, "active");
  }
  // Test file_name search
  const reportFilesResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { file_name: "report" },
      },
    );
  typia.assert(reportFilesResponse);
  TestValidator.equals(
    "file_name search returns correct count",
    reportFilesResponse.data.length,
    createdFiles.filter((f) => f.file_name.toLowerCase().includes("report"))
      .length,
  );
  for (const file of reportFilesResponse.data) {
    TestValidator.predicate(
      "searched files contain substring",
      file.file_name.toLowerCase().includes("report"),
    );
  }
  // Test file_size_range filter
  const sizeRangeResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { file_size_range: { min: 10000, max: 100000 } },
      },
    );
  typia.assert(sizeRangeResponse);
  for (const file of sizeRangeResponse.data) {
    TestValidator.predicate(
      "filtered files within size range",
      file.file_size >= 10000 && file.file_size <= 100000,
    );
  }
  // Test created_at_range filter
  const now = new Date();
  const createdAtRangeResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: {
          created_at_range: {
            start: new Date(now.getTime() - 3600000).toISOString(),
            end: now.toISOString(),
          },
        },
      },
    );
  typia.assert(createdAtRangeResponse);
  // 6. Sorting Validation
  // Test sortBy=created_at, sortOrder=asc
  const ascSortingResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { sort_by: "created_at", sort_order: "asc", limit: 100 },
      },
    );
  typia.assert(ascSortingResponse);
  for (let i = 1; i < ascSortingResponse.data.length; i++) {
    TestValidator.predicate(
      "ascending sort is correct",
      new Date(ascSortingResponse.data[i - 1].created_at) <=
        new Date(ascSortingResponse.data[i].created_at),
    );
  }
  // Test sortBy=created_at, sortOrder=desc
  const descSortingResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { sort_by: "created_at", sort_order: "desc", limit: 100 },
      },
    );
  typia.assert(descSortingResponse);
  for (let i = 1; i < descSortingResponse.data.length; i++) {
    TestValidator.predicate(
      "descending sort is correct",
      new Date(descSortingResponse.data[i - 1].created_at) >=
        new Date(descSortingResponse.data[i].created_at),
    );
  }
  // Test sortBy=file_size, sortOrder=desc
  const sizeDescResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { sort_by: "file_size", sort_order: "desc", limit: 100 },
      },
    );
  typia.assert(sizeDescResponse);
  for (let i = 1; i < sizeDescResponse.data.length; i++) {
    TestValidator.predicate(
      "size descending sort is correct",
      sizeDescResponse.data[i - 1].file_size >=
        sizeDescResponse.data[i].file_size,
    );
  }
  // Test sortBy=file_name, sortOrder=asc
  const nameAscResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { sort_by: "file_name", sort_order: "asc", limit: 100 },
      },
    );
  typia.assert(nameAscResponse);
  for (let i = 1; i < nameAscResponse.data.length; i++) {
    TestValidator.predicate(
      "name ascending sort is correct",
      nameAscResponse.data[i - 1].file_name.localeCompare(
        nameAscResponse.data[i].file_name,
      ) <= 0,
    );
  }
  // 7. Pagination Validation
  // Test with limit=20 (default)
  const limit20Response =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { limit: 20 },
      },
    );
  typia.assert(limit20Response);
  TestValidator.predicate(
    "limit 20 returns up to 20 records",
    limit20Response.data.length <= 20,
  );
  TestValidator.equals(
    "limit 20 pagination limit",
    limit20Response.pagination.limit,
    20,
  );
  // Test with limit=100 (maximum)
  const limit100Response =
    await api.functional.hrmPlatform.member.organizations.files.index(
      listingConnection,
      {
        organizationId,
        body: { limit: 100 },
      },
    );
  typia.assert(limit100Response);
  TestValidator.predicate(
    "limit 100 returns all records if less than 100",
    limit100Response.data.length === createdFiles.length,
  );
  TestValidator.equals(
    "limit 100 pagination limit",
    limit100Response.pagination.limit,
    100,
  );
  // Test pagination metadata consistency
  TestValidator.equals(
    "pagination pages calculation",
    limit100Response.pagination.pages,
    1,
  );
  TestValidator.equals(
    "pagination records match",
    limit100Response.pagination.records,
    createdFiles.length,
  );
}
