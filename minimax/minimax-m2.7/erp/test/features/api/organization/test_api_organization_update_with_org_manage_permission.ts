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

export async function test_api_organization_update_with_org_manage_permission(
  connection: api.IConnection,
): Promise<void> {
  // 1. First admin creates organization (becomes owner)
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
  // Create organization with first admin (who becomes owner)
  const organization = await generate_random_erp_hrm_admin_organizations_create(
    firstAdminConnection,
    {},
  );
  typia.assert(organization);
  // Store original fiscal start month
  const originalFiscalMonth = organization.fiscalStartMonth;
  // 2. Second admin joins (simulating org:manage permission holder)
  const secondAdminConnection: api.IConnection = { host: connection.host };
  const secondAdmin = await authorize_admin_join(secondAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(secondAdmin);
  // 3. Second admin with org:manage permission updates organization
  const newFiscalMonth =
    originalFiscalMonth === 1 ? 12 : originalFiscalMonth - 1;
  const updatedOrganization =
    await api.functional.erpHrm.admin.organizations.update(
      secondAdminConnection,
      {
        organizationId: organization.id,
        body: {
          fiscal_start_month: newFiscalMonth satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        } satisfies IErpHrmOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrganization);
  // 4. Verify update succeeded
  TestValidator.equals(
    "fiscalStartMonth updated",
    updatedOrganization.fiscalStartMonth,
    newFiscalMonth,
  );
  TestValidator.equals(
    "organization id unchanged",
    updatedOrganization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name unchanged",
    updatedOrganization.name,
    organization.name,
  );
}
