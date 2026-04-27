import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMemberSession";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganizationFile";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingOrganizationFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingOrganizationFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_time_tracking_member_organizations_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_create";
import { generate_random_hrm_time_tracking_member_organizations_files_create } from "../../../generate/generate_random_hrm_time_tracking_member_organizations_files_create";
import { prepare_random_hrm_time_tracking_organization } from "../../../prepare/prepare_random_hrm_time_tracking_organization";
import { prepare_random_hrm_time_tracking_organization_file } from "../../../prepare/prepare_random_hrm_time_tracking_organization_file";

/**
 * Test filtering organization files by file type, name, extension, MIME type, and size range.
 *
 * Validates the PATCH organization files index endpoint's filtering capabilities by creating
 * multiple files with distinct characteristics and asserting that each filter combination
 * returns the correct subset of files. Also validates pagination metadata accuracy.
 *
 * 1. Registers a member, creates an organization, and uploads 4 files of varying types
 *    (logo, report_attachment), extensions (png, jpg, pdf), sizes, and names.
 * 2. Filters by type: verifies exact match on the 'type' field.
 * 3. Filters by name: verifies case-insensitive substring matching.
 * 4. Filters by extension: verifies exact match on extension.
 * 5. Filters by MIME type prefix: verifies prefix matching via 'mime_type'.
 * 6. Filters by size range: verifies min/max byte range filtering.
 * 7. Filters by multiple criteria combined: verifies intersection of filters.
 * 8. Validates pagination metadata (current, limit, records, pages) for each result.
 */
export async function test_api_organization_files_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  const organizationId = organization.id;
  // 3. Upload files with different characteristics
  const file1 =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          type: "logo",
          extension: "png",
          mimeType: "image/png",
          size: 2000,
          name: "company_logo.png",
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(file1);
  const file2 =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          type: "logo",
          extension: "jpg",
          mimeType: "image/jpeg",
          size: 4000,
          name: "logo_badge.jpg",
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(file2);
  const file3 =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          type: "report_attachment",
          extension: "pdf",
          mimeType: "application/pdf",
          size: 10000,
          name: "quarterly_report.pdf",
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(file3);
  const file4 =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: { organizationId },
        body: {
          type: "report_attachment",
          extension: "png",
          mimeType: "image/png",
          size: 3000,
          name: "summary_report.png",
          url: typia.random<string & tags.Format<"uri">>(),
        },
      },
    );
  typia.assert(file4);
  // 4. Test filtering by type = 'logo'
  const logoResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          type: "logo",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(logoResult);
  TestValidator.equals("logo type filter count", logoResult.data.length, 2);
  TestValidator.predicate("logo filter contains file1", () =>
    logoResult.data.some((f) => f.id === file1.id),
  );
  TestValidator.predicate("logo filter contains file2", () =>
    logoResult.data.some((f) => f.id === file2.id),
  );
  TestValidator.predicate("logo filter excludes file3", () =>
    logoResult.data.every((f) => f.id !== file3.id),
  );
  TestValidator.predicate("logo filter excludes file4", () =>
    logoResult.data.every((f) => f.id !== file4.id),
  );
  TestValidator.predicate(
    "logo pagination has records",
    () => logoResult.pagination.records >= 2,
  );
  // 5. Test filtering by type = 'report_attachment'
  const reportResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          type: "report_attachment",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(reportResult);
  TestValidator.equals(
    "report_attachment filter count",
    reportResult.data.length,
    2,
  );
  TestValidator.predicate("report filter contains file3", () =>
    reportResult.data.some((f) => f.id === file3.id),
  );
  TestValidator.predicate("report filter contains file4", () =>
    reportResult.data.some((f) => f.id === file4.id),
  );
  TestValidator.predicate("report filter excludes file1", () =>
    reportResult.data.every((f) => f.id !== file1.id),
  );
  // 6. Test filtering by nonexistent type
  const emptyResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          type: "nonexistent_type",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "nonexistent type returns empty",
    emptyResult.data.length,
    0,
  );
  // 7. Test filtering by name substring ('logo' case-insensitive)
  const nameResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          name: "logo",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(nameResult);
  TestValidator.equals("name filter count", nameResult.data.length, 2);
  TestValidator.predicate("name filter matches file1", () =>
    nameResult.data.some((f) => f.id === file1.id),
  );
  TestValidator.predicate("name filter matches file2", () =>
    nameResult.data.some((f) => f.id === file2.id),
  );
  // 8. Test filtering by extension = 'png'
  const extResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          extension: "png",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(extResult);
  TestValidator.equals("png extension filter count", extResult.data.length, 2);
  TestValidator.predicate("ext filter matches file1", () =>
    extResult.data.some((f) => f.id === file1.id),
  );
  TestValidator.predicate("ext filter matches file4", () =>
    extResult.data.some((f) => f.id === file4.id),
  );
  // 9. Test filtering by MIME type prefix = 'image/'
  const mimeResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          mime_type: "image/",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(mimeResult);
  TestValidator.predicate(
    "mime filter count >= 3",
    mimeResult.data.length >= 3,
  );
  TestValidator.predicate("mime filter has file1", () =>
    mimeResult.data.some((f) => f.id === file1.id),
  );
  TestValidator.predicate("mime filter has file2", () =>
    mimeResult.data.some((f) => f.id === file2.id),
  );
  TestValidator.predicate("mime filter has file4", () =>
    mimeResult.data.some((f) => f.id === file4.id),
  );
  // 10. Test filtering by size range (1000-5000)
  const sizeResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          size_min: 1000,
          size_max: 5000,
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(sizeResult);
  TestValidator.equals("size range filter count", sizeResult.data.length, 3);
  TestValidator.predicate("size filter has file1 (2000)", () =>
    sizeResult.data.some((f) => f.id === file1.id),
  );
  TestValidator.predicate("size filter has file2 (4000)", () =>
    sizeResult.data.some((f) => f.id === file2.id),
  );
  TestValidator.predicate("size filter has file4 (3000)", () =>
    sizeResult.data.some((f) => f.id === file4.id),
  );
  TestValidator.predicate("size filter excludes file3 (10000)", () =>
    sizeResult.data.every((f) => f.id !== file3.id),
  );
  // 11. Test multiple filters combined: type='logo' AND extension='png'
  const combinedResult =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId,
        body: {
          type: "logo",
          extension: "png",
        } satisfies IHrmTimeTrackingOrganizationFile.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.equals("combined filter count", combinedResult.data.length, 1);
  TestValidator.equals(
    "combined filter matches file1 only",
    combinedResult.data[0]!.id,
    file1.id,
  );
  // 12. Validate pagination metadata for each result
  for (const result of [
    logoResult,
    reportResult,
    nameResult,
    extResult,
    sizeResult,
    combinedResult,
  ]) {
    TestValidator.predicate(
      "pagination current",
      () => result.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit",
      () => result.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination records matches data",
      () => result.pagination.records >= result.data.length,
    );
    TestValidator.predicate(
      "pagination pages consistent",
      () =>
        result.pagination.pages ===
        Math.ceil(result.pagination.records / result.pagination.limit),
    );
  }
}
