import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmAdmin";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_erp_hrm_admin_organizations_create } from "../../../generate/generate_random_erp_hrm_admin_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

export async function test_api_organization_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create organization with the admin as owner
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // Store original updatedAt timestamp
  const originalUpdatedAt = organization.updatedAt;
  // 3. Update organization with new values
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency: "EUR",
    timezone: "America/New_York",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >() satisfies number as number,
  } satisfies IErpHrmOrganization.IUpdate;
  const updatedOrganization =
    await api.functional.erpHrm.admin.organizations.update(adminConnection, {
      organizationId: organization.id,
      body: updateBody,
    });
  typia.assert(updatedOrganization);
  // 4. Validate updated values
  TestValidator.equals(
    "name updated",
    updatedOrganization.name,
    updateBody.name,
  );
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    updateBody.description,
  );
  TestValidator.equals("currency updated", updatedOrganization.currency, "EUR");
  TestValidator.equals(
    "timezone updated",
    updatedOrganization.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    updatedOrganization.fiscalStartMonth,
    updateBody.fiscal_start_month,
  );
  // 5. Validate updatedAt timestamp changed
  TestValidator.predicate(
    "updatedAt timestamp changed",
    updatedOrganization.updatedAt !== originalUpdatedAt,
  );
}
