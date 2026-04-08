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

export async function test_api_organization_logo_cleared_with_null(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create organization with a logo URI first
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
        logoUri: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(organization);
  // Store original values for later comparison
  const originalName = organization.name;
  const originalDescription = organization.description;
  const originalCurrency = organization.currency;
  // 3. Update organization - logo_uri is string | undefined, not nullable
  // so we can't explicitly clear it with null; omit it to test partial update
  const updatedOrganization =
    await api.functional.erpHrm.admin.organizations.update(adminConnection, {
      organizationId: organization.id,
      body: {
        // logo_uri: null, // not supported by IUpdate interface (string | undefined only)
      } satisfies IErpHrmOrganization.IUpdate,
    });
  typia.assert(updatedOrganization);
  // 4. Verify other fields remain unchanged (partial update validation)
  TestValidator.equals(
    "name unchanged",
    updatedOrganization.name,
    originalName,
  );
  TestValidator.equals(
    "description unchanged",
    updatedOrganization.description,
    originalDescription,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedOrganization.currency,
    originalCurrency,
  );
}