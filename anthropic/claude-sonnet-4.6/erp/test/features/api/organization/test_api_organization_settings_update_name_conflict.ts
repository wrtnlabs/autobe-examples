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

export async function test_api_organization_settings_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member and create their connection
  const member1Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create Organization A with a unique name
  const orgA = await generate_random_erp_hrm_member_organizations_create(
    member1Connection,
    {
      body: {
        name: "Alpha Corp",
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(orgA);
  // 3. Register second member and create their connection
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 4. Create Organization B with name "Beta Corp" under member 2
  const orgB = await generate_random_erp_hrm_member_organizations_create(
    member2Connection,
    {
      body: {
        name: "Beta Corp",
        currency: "USD",
        timezone: "America/New_York",
        fiscal_start_month: 1,
      },
    },
  );
  typia.assert(orgB);
  // 5. Attempt to update Organization A's name to "Beta Corp" (already taken) - must fail with conflict
  await TestValidator.error(
    "updating org A name to already-taken Beta Corp must return conflict error",
    async () => {
      await api.functional.erpHrm.member.organizations.update(
        member1Connection,
        {
          organizationId: orgA.id,
          body: {
            name: "Beta Corp",
          } satisfies IErpHrmOrganization.IUpdate,
        },
      );
    },
  );
  // 6. Perform a valid update to a truly unique name - must succeed
  const uniqueName = `Alpha Corp Renamed ${RandomGenerator.alphaNumeric(8)}`;
  const updatedOrgA = await api.functional.erpHrm.member.organizations.update(
    member1Connection,
    {
      organizationId: orgA.id,
      body: {
        name: uniqueName,
      } satisfies IErpHrmOrganization.IUpdate,
    },
  );
  typia.assert(updatedOrgA);
  // 7. Validate the returned organization has the correct updated name
  TestValidator.equals(
    "org A name updated to unique name correctly",
    updatedOrgA.name,
    uniqueName,
  );
}
