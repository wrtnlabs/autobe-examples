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

export async function test_api_organization_report_attachment_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Upload a report_attachment file with explicit PDF metadata
  const size = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
  >();
  const reportFile =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        body: {
          name: "monthly_report.pdf",
          extension: "pdf",
          mimeType: "application/pdf",
          size,
          url: typia.random<string & tags.Format<"uri">>(),
          type: "report_attachment",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(reportFile);
  // 4. Validate
  TestValidator.equals(
    "type is report_attachment",
    reportFile.type,
    "report_attachment",
  );
  TestValidator.equals("version is 1", reportFile.version, 1);
  TestValidator.equals(
    "name matches input",
    reportFile.name,
    "monthly_report.pdf",
  );
  TestValidator.equals("extension is pdf", reportFile.extension, "pdf");
  TestValidator.equals(
    "mime type is application/pdf",
    reportFile.mime_type,
    "application/pdf",
  );
  TestValidator.equals("size matches input", reportFile.size, size);
  TestValidator.equals(
    "organization id matches",
    reportFile.organization.id,
    organization.id,
  );
}
