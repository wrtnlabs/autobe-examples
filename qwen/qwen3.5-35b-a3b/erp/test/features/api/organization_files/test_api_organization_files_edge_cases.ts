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

export async function test_api_organization_files_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create authenticated member with organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberResult);
  typia.assert(memberResult.member);
  // 2. Extract organization ID from member session
  const organizationId = memberResult.member.id;
  // 3. Prepare and upload diverse test files covering edge cases
  const baseDate = new Date();
  const filesToCreate = [
    // Different file types
    {
      file_key: `file-type-logo-1-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "company-logo.png",
      file_type: "logo",
      file_size: 5000,
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-type-image-1-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "banner-image.png",
      file_type: "image/png",
      file_size: 50000,
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-type-image-2-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "thumbnail.jpg",
      file_type: "image/jpeg",
      file_size: 25000,
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-type-doc-1-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "report.pdf",
      file_type: "document",
      file_size: 150000,
      storage_type: "s3",
      status: "active",
    },
    // Different statuses
    {
      file_key: `file-status-deleted-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "old-document.pdf",
      file_type: "document",
      file_size: 100000,
      storage_type: "s3",
      status: "deleted",
    },
    {
      file_key: `file-status-archived-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "archive-2023.zip",
      file_type: "document",
      file_size: 500000,
      storage_type: "s3",
      status: "archived",
    },
    // Different sizes
    {
      file_key: `file-size-small-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "tiny.txt",
      file_type: "document",
      file_size: 500, // <1KB
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-size-medium-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "medium-doc.docx",
      file_type: "document",
      file_size: 50000, // 1-100KB
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-size-large-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "large-video.mp4",
      file_type: "video",
      file_size: 2000000, // >100KB
      storage_type: "s3",
      status: "active",
    },
    // Similar filenames for contains search
    {
      file_key: `file-similar-1-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "Project Report Final.pdf",
      file_type: "document",
      file_size: 100000,
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-similar-2-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "Project Report Draft.pdf",
      file_type: "document",
      file_size: 80000,
      storage_type: "s3",
      status: "active",
    },
    {
      file_key: `file-similar-3-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "Project Report Final V2.pdf",
      file_type: "document",
      file_size: 110000,
      storage_type: "s3",
      status: "active",
    },
    // Special characters in filename
    {
      file_key: `file-special-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "file-with-special-chars_2024-v1.0.txt",
      file_type: "document",
      file_size: 2000,
      storage_type: "s3",
      status: "active",
    },
    // Different timestamps
    {
      file_key: `file-date-old-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "old-file.pdf",
      file_type: "document",
      file_size: 50000,
      storage_type: "s3",
      status: "active",
      created_at: new Date(
        baseDate.getTime() - 30 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 30 days ago
    },
    {
      file_key: `file-date-new-${RandomGenerator.alphaNumeric(8)}`,
      file_name: "new-file.pdf",
      file_type: "document",
      file_size: 50000,
      storage_type: "s3",
      status: "active",
      created_at: new Date(
        baseDate.getTime() - 1 * 24 * 60 * 60 * 1000,
      ).toISOString(), // 1 day ago
    },
  ];
  // Upload all test files
  const createdFiles: IHrmPlatformOrganizationFile[] = [];
  for (const fileData of filesToCreate) {
    const createdFile =
      await generate_random_hrm_platform_member_organizations_files_create(
        memberConnection,
        {
          params: { organizationId },
          body: fileData as any,
        },
      );
    typia.assert(createdFile);
    createdFiles.push(createdFile);
  }
  // 4. Test empty filter arrays - should return all files
  const emptyFilterResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_type: [],
          status: [],
          limit: 100,
        },
      },
    );
  typia.assert(emptyFilterResponse);
  TestValidator.equals(
    "empty filters returns all files",
    emptyFilterResponse.data.length,
    createdFiles.length,
  );
  TestValidator.equals(
    "empty filters pagination records",
    emptyFilterResponse.pagination.records,
    createdFiles.length,
  );
  // 5. Test single file filtering - filter by specific file_type
  const logoFiles = createdFiles.filter((f) => f.file_type === "logo");
  const singleFilterResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_type: ["logo"],
          limit: 100,
        },
      },
    );
  typia.assert(singleFilterResponse);
  TestValidator.equals(
    "single type filter returns correct count",
    singleFilterResponse.data.length,
    logoFiles.length,
  );
  // 6. Test no results scenario - filter with non-existent status
  const noResultsResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          status: ["nonexistent" as any],
          limit: 100,
        },
      },
    );
  typia.assert(noResultsResponse);
  TestValidator.equals(
    "no results returns empty array",
    noResultsResponse.data.length,
    0,
  );
  TestValidator.equals(
    "no results pagination records",
    noResultsResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "no results pagination pages",
    noResultsResponse.pagination.pages,
    0,
  );
  // 7. Test overlapping filters - multiple conditions intersect
  const overlappingFilterResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_type: ["document"],
          status: ["active"],
          file_size_range: { min: 0, max: 200000 },
          limit: 100,
        },
      },
    );
  typia.assert(overlappingFilterResponse);
  const expectedOverlap = createdFiles.filter(
    (f) =>
      f.file_type === "document" &&
      f.status === "active" &&
      f.file_size <= 200000,
  );
  TestValidator.equals(
    "overlapping filters returns intersection",
    overlappingFilterResponse.data.length,
    expectedOverlap.length,
  );
  // 8. Test filename search edge cases
  // 8a. Search with special characters
  const specialCharResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_name: "_2024",
          limit: 100,
        },
      },
    );
  typia.assert(specialCharResponse);
  TestValidator.equals(
    "special char search works",
    specialCharResponse.data.length,
    1,
  );
  // 8b. Case-insensitive search
  const caseInsensitiveResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_name: "PROJECT REPORT",
          limit: 100,
        },
      },
    );
  typia.assert(caseInsensitiveResponse);
  TestValidator.equals(
    "case-insensitive search works",
    caseInsensitiveResponse.data.length,
    3,
  );
  // 8c. Single character pattern
  const singleCharResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_name: "x",
          limit: 100,
        },
      },
    );
  typia.assert(singleCharResponse);
  // Should return files with 'x' in filename
  // 9. Test date range edge cases
  // 9a. Date range including all files
  const dateRangeStart = new Date(
    baseDate.getTime() - 60 * 24 * 60 * 60 * 1000,
  );
  const dateRangeEnd = new Date(baseDate.getTime() + 1 * 24 * 60 * 60 * 1000);
  const dateRangeAllResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          created_at_range: {
            start: dateRangeStart.toISOString(),
            end: dateRangeEnd.toISOString(),
          },
          limit: 100,
        },
      },
    );
  typia.assert(dateRangeAllResponse);
  TestValidator.equals(
    "date range all includes all files",
    dateRangeAllResponse.data.length,
    createdFiles.length,
  );
  // 9b. Date range including no files
  const dateRangeNoneStart = new Date(
    baseDate.getTime() - 100 * 24 * 60 * 60 * 1000,
  );
  const dateRangeNoneEnd = new Date(
    baseDate.getTime() - 99 * 24 * 60 * 60 * 1000,
  );
  const dateRangeNoneResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          created_at_range: {
            start: dateRangeNoneStart.toISOString(),
            end: dateRangeNoneEnd.toISOString(),
          },
          limit: 100,
        },
      },
    );
  typia.assert(dateRangeNoneResponse);
  TestValidator.equals(
    "date range none returns empty",
    dateRangeNoneResponse.data.length,
    0,
  );
  // 10. Test file size range edge cases
  // 10a. Size range including all files
  const sizeRangeAllResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_size_range: { min: 0, max: 5000000 },
          limit: 100,
        },
      },
    );
  typia.assert(sizeRangeAllResponse);
  TestValidator.equals(
    "size range all includes all files",
    sizeRangeAllResponse.data.length,
    createdFiles.length,
  );
  // 10b. Size range including no files
  const sizeRangeNoneResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_size_range: { min: 9999999, max: 10000000 },
          limit: 100,
        },
      },
    );
  typia.assert(sizeRangeNoneResponse);
  TestValidator.equals(
    "size range none returns empty",
    sizeRangeNoneResponse.data.length,
    0,
  );
  // 10c. Exact size match (min=max)
  const exactSize = 5000;
  const exactSizeResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          file_size_range: { min: exactSize, max: exactSize },
          limit: 100,
        },
      },
    );
  typia.assert(exactSizeResponse);
  const exactSizeFiles = createdFiles.filter((f) => f.file_size === exactSize);
  TestValidator.equals(
    "exact size match works",
    exactSizeResponse.data.length,
    exactSizeFiles.length,
  );
  // 11. Test pagination boundary conditions
  // 11a. Minimum limit (limit=1)
  const limitOneResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          limit: 1,
        },
      },
    );
  typia.assert(limitOneResponse);
  TestValidator.equals(
    "limit 1 returns single record",
    limitOneResponse.data.length,
    1,
  );
  TestValidator.equals(
    "limit 1 pagination limit",
    limitOneResponse.pagination.limit,
    1,
  );
  // 11b. Limit exceeding total records
  const largeLimitResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          limit: 1000,
        },
      },
    );
  typia.assert(largeLimitResponse);
  TestValidator.equals(
    "large limit returns all available",
    largeLimitResponse.data.length,
    createdFiles.length,
  );
  TestValidator.equals(
    "large limit pagination records",
    largeLimitResponse.pagination.records,
    createdFiles.length,
  );
  TestValidator.equals(
    "large limit pages is 1",
    largeLimitResponse.pagination.pages,
    1,
  );
  // 11c. Request page beyond available range
  const beyondRangeResponse =
    await api.functional.hrmPlatform.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          page: 9999,
          limit: 10,
        },
      },
    );
  typia.assert(beyondRangeResponse);
  TestValidator.equals(
    "beyond range returns empty",
    beyondRangeResponse.data.length,
    0,
  );
  TestValidator.equals(
    "beyond range pagination current",
    beyondRangeResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "beyond range pagination pages",
    beyondRangeResponse.pagination.pages,
    Math.ceil(createdFiles.length / 10),
  );
}