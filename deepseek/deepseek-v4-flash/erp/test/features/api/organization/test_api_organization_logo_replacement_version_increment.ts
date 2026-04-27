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

export async function test_api_organization_logo_replacement_version_increment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create an organization
  const organization =
    await generate_random_hrm_time_tracking_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Upload first logo file — version should be 1
  const firstLogo =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        body: {
          type: "logo",
          name: "company_logo.png",
          extension: "png",
          mimeType: "image/png",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(firstLogo);
  TestValidator.equals("first logo version", firstLogo.version, 1);
  // 4. Upload second logo file with different metadata — version should auto-increment to 2
  const secondLogo =
    await generate_random_hrm_time_tracking_member_organizations_files_create(
      memberConnection,
      {
        body: {
          type: "logo",
          name: "company_logo_v2.png",
          extension: "png",
          mimeType: "image/png",
        },
        params: {
          organizationId: organization.id,
        },
      },
    );
  typia.assert(secondLogo);
  TestValidator.equals("second logo version", secondLogo.version, 2);
  // 5. Validate both files belong to the same organization
  TestValidator.equals(
    "first file organization id",
    firstLogo.organization.id,
    organization.id,
  );
  TestValidator.equals(
    "second file organization id",
    secondLogo.organization.id,
    organization.id,
  );
  // 6. Validate versions differ
  TestValidator.notEquals(
    "versions are different",
    firstLogo.version,
    secondLogo.version,
  );
}
