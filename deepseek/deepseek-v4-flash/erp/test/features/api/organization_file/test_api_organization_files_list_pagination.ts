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

export async function test_api_organization_files_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create organization
  const organization: IHrmTimeTrackingOrganization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Upload 3 files with distinct names, extensions, MIME types, and purpose types
  const fileConfigs = [
    {
      name: "logo_file.png",
      extension: "png",
      mimeType: "image/png",
      type: "logo",
    },
    {
      name: "report_1.jpg",
      extension: "jpg",
      mimeType: "image/jpeg",
      type: "report_attachment",
    },
    {
      name: "document.pdf",
      extension: "pdf",
      mimeType: "application/pdf",
      type: "report_attachment",
    },
  ] as const;
  const files: IHrmTimeTrackingOrganizationFile[] = [];
  for (const config of fileConfigs) {
    const file =
      await generate_random_hrm_time_tracking_member_organizations_files_create(
        memberConnection,
        {
          body: {
            name: config.name,
            extension: config.extension,
            mimeType: config.mimeType,
            type: config.type,
          },
          params: { organizationId: organization.id },
        },
      );
    typia.assert(file);
    files.push(file);
  }
  // 4. List files with no filter criteria (default pagination)
  const pageDefault: IPageIHrmTimeTrackingOrganizationFile.ISummary =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {},
      },
    );
  typia.assert(pageDefault);
  // 5. Validate pagination metadata
  TestValidator.equals("pagination current", pageDefault.pagination.current, 1);
  TestValidator.equals("pagination limit", pageDefault.pagination.limit, 10);
  TestValidator.equals("pagination records", pageDefault.pagination.records, 3);
  TestValidator.predicate(
    "pagination pages >= 1",
    () => pageDefault.pagination.pages >= 1,
  );
  // 6. Validate all 3 files are returned
  TestValidator.equals("files count", pageDefault.data.length, 3);
  // 7. Validate files are ordered by created_at descending (newest first)
  for (let i = 0; i < pageDefault.data.length - 1; i++) {
    TestValidator.predicate(
      `file[${i}] created_at >= file[${i + 1}] created_at`,
      () =>
        pageDefault.data[i].created_at >= pageDefault.data[i + 1].created_at,
    );
  }
  // 8. Validate all files reference the correct organization
  for (const file of pageDefault.data) {
    TestValidator.equals(
      `file ${file.id} organization id`,
      file.organization.id,
      organization.id,
    );
  }
  // 9. Validate no soft-deleted files (all deleted_at should be null)
  for (const file of pageDefault.data) {
    TestValidator.equals(
      `file ${file.id} deleted_at is null`,
      file.deleted_at,
      null,
    );
  }
  // 10. Test pagination with limit=2
  const pageLimited: IPageIHrmTimeTrackingOrganizationFile.ISummary =
    await api.functional.hrmTimeTracking.member.organizations.files.index(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          page: 1,
          limit: 2,
        },
      },
    );
  typia.assert(pageLimited);
  // 11. Validate limit is respected
  TestValidator.predicate(
    "limit=2 data length <= 2",
    () => pageLimited.data.length <= 2,
  );
  TestValidator.equals(
    "limit=2 pagination limit",
    pageLimited.pagination.limit,
    2,
  );
  TestValidator.equals("limit=2 records", pageLimited.pagination.records, 3);
  TestValidator.predicate(
    "limit=2 pages >= 2",
    () => pageLimited.pagination.pages >= 2,
  );
}
