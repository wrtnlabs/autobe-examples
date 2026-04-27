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

export async function test_api_organization_file_retrieval_active_file_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a new organization with specific configuration
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  // 3. Register a logo file for the organization
  const file =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        body: {
          name: "company_logo.png",
          extension: "png",
          mimeType: "image/png",
          size: 102400,
          url: "https://storage.example.com/logo.png",
          type: "logo",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(file);
  // 4. Retrieve the file via GET endpoint
  const retrievedFile =
    await api.functional.hrmTimeTracking.member.organizations.files.at(
      memberConnection,
      {
        organizationId: organization.id,
        fileId: file.id,
      },
    );
  typia.assert(retrievedFile);
  // 5. Validate the retrieved file matches the created file
  TestValidator.equals("file id matches", retrievedFile.id, file.id);
  TestValidator.equals(
    "file name matches",
    retrievedFile.name,
    "company_logo.png",
  );
  TestValidator.equals(
    "file extension matches",
    retrievedFile.extension,
    "png",
  );
  TestValidator.equals(
    "file mime type matches",
    retrievedFile.mime_type,
    "image/png",
  );
  TestValidator.equals("file size matches", retrievedFile.size, 102400);
  TestValidator.equals(
    "file url matches",
    retrievedFile.url,
    "https://storage.example.com/logo.png",
  );
  TestValidator.equals("file type matches", retrievedFile.type, "logo");
  TestValidator.equals(
    "organization id matches",
    retrievedFile.organization.id,
    organization.id,
  );
  TestValidator.predicate(
    "deleted_at is null",
    retrievedFile.deleted_at === null,
  );
  TestValidator.predicate(
    "created_at is present",
    typeof retrievedFile.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof retrievedFile.updated_at === "string",
  );
}
