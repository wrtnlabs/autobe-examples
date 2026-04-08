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

export async function test_api_organization_creation_with_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create organization with only minimal required fields
  const organization = await api.functional.erpHrm.admin.organizations.create(
    adminConnection,
    {
      body: {
        name: "Minimal Org",
        currency: "EUR",
        timezone: "Europe/London",
        fiscalStartMonth: 4,
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(organization);
  // 3. Validate required fields match input
  TestValidator.equals("organization name", organization.name, "Minimal Org");
  TestValidator.equals("currency", organization.currency, "EUR");
  TestValidator.equals("timezone", organization.timezone, "Europe/London");
  TestValidator.equals("fiscal start month", organization.fiscalStartMonth, 4);
  // 4. Validate optional fields are null or undefined (not present)
  TestValidator.equals("description is null", organization.description, null);
  TestValidator.equals("logoUri is null", organization.logoUri, null);
  // 5. Validate owner exists with valid structure
  TestValidator.predicate("owner exists", !!organization.owner);
  TestValidator.equals("owner has valid id", !!organization.owner.id, true);
  TestValidator.equals(
    "owner has display name",
    !!organization.owner.displayName,
    true,
  );
}
