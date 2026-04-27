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

/**
 * Test uploading the first organization logo file.
 *
 * Joins a new member, creates an organization (auto-assigning the member as owner with org:manage permission), and uploads a logo image file. Validates that the response returns the created file entity with version set to 1 (first upload), correct metadata fields matching the input, and the organization field referencing the correct organization summary.
 *
 * 1. Join as a new member and authenticate.
 * 2. Create an organization (member becomes the owner).
 * 3. Upload a logo file with type='logo' and explicit metadata.
 * 4. Validate file metadata, version, timestamps, and organization reference.
 */
export async function test_api_organization_logo_first_upload(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Organization creation (member auto-assigned as owner)
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Upload the first organization logo file
  const fileInput = {
    name: "company_logo.png",
    extension: "png",
    mimeType: "image/png",
    size: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
    >(),
    url: typia.random<string & tags.Format<"uri">>(),
    type: "logo",
  } satisfies IHrmTimeTrackingOrganizationFile.ICreate;
  const file =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        params: { organizationId: organization.id },
        body: fileInput,
      },
    );
  typia.assert(file);
  // 4. Validate business logic
  TestValidator.equals("file name", file.name, "company_logo.png");
  TestValidator.equals("file extension", file.extension, "png");
  TestValidator.equals("file mime type", file.mime_type, "image/png");
  TestValidator.equals("file type", file.type, "logo");
  TestValidator.equals("version is 1 for first upload", file.version, 1);
  // Validate organization reference in response
  TestValidator.equals(
    "organization id matches",
    file.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    file.organization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization status is active",
    file.organization.status,
    "active",
  );
}
