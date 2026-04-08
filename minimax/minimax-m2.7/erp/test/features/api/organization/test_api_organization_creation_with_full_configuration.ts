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

export async function test_api_organization_creation_with_full_configuration(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as admin using the join utility function
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 3. Define organization configuration with all fields
  const organizationConfig = {
    name: "TechCorp Solutions",
    description: "Technology consulting firm",
    currency: "USD",
    timezone: "America/New_York",
    fiscalStartMonth: 1 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<12>,
  } satisfies IErpHrmOrganization.ICreate;
  // 4. Create the organization with full configuration
  const organization = await api.functional.erpHrm.admin.organizations.create(
    adminConnection,
    {
      body: organizationConfig,
    },
  );
  typia.assert(organization);
  // 5. Validate response structure and values
  // Validate organization id is a valid UUID
  TestValidator.predicate(
    "organization id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      organization.id,
    ),
  );
  // Validate name matches
  TestValidator.equals(
    "organization name matches",
    organization.name,
    organizationConfig.name,
  );
  // Validate description matches
  TestValidator.equals(
    "organization description matches",
    organization.description,
    organizationConfig.description,
  );
  // Validate currency matches
  TestValidator.equals(
    "organization currency matches",
    organization.currency,
    organizationConfig.currency,
  );
  // Validate timezone matches
  TestValidator.equals(
    "organization timezone matches",
    organization.timezone,
    organizationConfig.timezone,
  );
  // Validate fiscal start month matches
  TestValidator.equals(
    "organization fiscal start month matches",
    organization.fiscalStartMonth,
    organizationConfig.fiscalStartMonth,
  );
  // Validate timestamps exist and are in ISO date-time format
  TestValidator.predicate(
    "createdAt is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(organization.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(organization.updatedAt),
  );
  // Validate owner member summary is present
  TestValidator.predicate(
    "owner summary exists",
    organization.owner !== null && organization.owner !== undefined,
  );
  // Validate owner has required summary fields
  TestValidator.predicate(
    "owner id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      organization.owner.id,
    ),
  );
  TestValidator.equals(
    "owner email matches admin email",
    organization.owner.email,
    admin.email,
  );
  TestValidator.equals(
    "owner display name matches admin display name",
    organization.owner.displayName,
    admin.display_name,
  );
}
