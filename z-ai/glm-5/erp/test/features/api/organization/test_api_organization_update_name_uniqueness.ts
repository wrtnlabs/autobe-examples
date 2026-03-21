import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
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

export async function test_api_organization_update_name_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create first organization with a unique name
  const firstOrgName = RandomGenerator.name();
  const firstOrg = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: firstOrgName,
        currency: "USD",
        timezone: "America/New_York",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(firstOrg);
  // 3. Create second organization with a different name
  const secondOrgName = RandomGenerator.name();
  const secondOrg = await generate_random_erp_hrm_member_organizations_create(
    memberConnection,
    {
      body: {
        name: secondOrgName,
        currency: "USD",
        timezone: "America/New_York",
        fiscalStartMonth: 1,
      },
    },
  );
  typia.assert(secondOrg);
  // 4. Attempt to update first organization's name to match second organization's name
  // This should fail due to the unique name constraint
  await TestValidator.error(
    "update organization name to duplicate should fail",
    async () => {
      await api.functional.erpHrm.member.organizations.update(
        memberConnection,
        {
          organizationId: firstOrg.id,
          body: { name: secondOrgName } satisfies IErpHrmOrganization.IUpdate,
        },
      );
    },
  );
}
