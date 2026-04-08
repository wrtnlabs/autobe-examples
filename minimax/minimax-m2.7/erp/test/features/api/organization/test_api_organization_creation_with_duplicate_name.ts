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

export async function test_api_organization_creation_with_duplicate_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register and login as first admin
  const firstAdminConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_admin_join(firstAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAdmin);
  // Step 2: Create first organization with a specific name
  const duplicateName = "Duplicate Test Corp";
  const firstOrg = await api.functional.erpHrm.admin.organizations.create(
    firstAdminConnection,
    {
      body: {
        name: duplicateName,
        currency: "USD",
        timezone: "Asia/Seoul",
        fiscalStartMonth: 1,
      } satisfies IErpHrmOrganization.ICreate,
    },
  );
  typia.assert(firstOrg);
  TestValidator.equals(
    "first organization name matches",
    firstOrg.name,
    duplicateName,
  );
  // Step 3: Register second admin (different user to attempt duplicate org)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Step 4: Attempt to create second organization with duplicate name
  // This should fail with HTTP 409 Conflict
  await TestValidator.error(
    "duplicate organization name should return 409 Conflict",
    async () => {
      await api.functional.erpHrm.admin.organizations.create(
        secondAdminConnection,
        {
          body: {
            name: duplicateName,
            currency: "EUR",
            timezone: "America/New_York",
            fiscalStartMonth: 4,
          } satisfies IErpHrmOrganization.ICreate,
        },
      );
    },
  );
}
