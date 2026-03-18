import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_creation_duplicate_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account and obtain an authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Choose a unique organization name to use for the duplicate test
  const uniqueOrgName = `DuplicateOrgTest-${typia.random<string & tags.Format<"uuid">>()}`;
  // 3. Create the first organization successfully
  const firstOrg = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: uniqueOrgName,
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(firstOrg);
  // Verify the first organization was created with the expected name
  TestValidator.equals(
    "first organization name matches",
    firstOrg.name,
    uniqueOrgName,
  );
  // 4. Attempt to create a second organization with the exact same name - expect 409 Conflict
  await TestValidator.error(
    "duplicate organization name must be rejected with conflict error",
    async () => {
      await generate_random_erp_hrm_member_organizations_create(
        memberConnection,
        {
          body: {
            name: uniqueOrgName,
            currency: "EUR",
            timezone: "Asia/Seoul",
            fiscal_start_month: 4,
          },
        },
      );
    },
  );
  // 5. Verify the original organization is still intact
  TestValidator.equals(
    "original organization name unchanged after duplicate rejection",
    firstOrg.name,
    uniqueOrgName,
  );
  TestValidator.predicate(
    "original organization is active (not deleted)",
    firstOrg.deleted_at === null,
  );
}
