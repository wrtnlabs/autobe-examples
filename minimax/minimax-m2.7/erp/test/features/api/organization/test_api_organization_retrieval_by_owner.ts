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

export async function test_api_organization_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create new admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate as admin by joining with credentials
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a new organization with required fields
  const createdOrganization =
    await generate_random_erp_hrm_admin_organizations_create(
      adminConnection,
      {},
    );
  typia.assert(createdOrganization);
  // 3. Retrieve the organization by its unique ID
  const retrievedOrganization =
    await api.functional.erpHrm.admin.organizations.at(adminConnection, {
      organizationId: createdOrganization.id,
    });
  typia.assert(retrievedOrganization);
  // 4. Validate retrieved organization matches created organization
  TestValidator.equals(
    "organization ID matches",
    retrievedOrganization.id,
    createdOrganization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedOrganization.name,
    createdOrganization.name,
  );
  TestValidator.equals(
    "organization description matches",
    retrievedOrganization.description,
    createdOrganization.description,
  );
  TestValidator.equals(
    "organization currency matches",
    retrievedOrganization.currency,
    createdOrganization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrievedOrganization.timezone,
    createdOrganization.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month matches",
    retrievedOrganization.fiscalStartMonth,
    createdOrganization.fiscalStartMonth,
  );
  TestValidator.equals(
    "organization owner ID matches",
    retrievedOrganization.owner.id,
    authorized.id,
  );
  TestValidator.equals(
    "organization owner email matches",
    retrievedOrganization.owner.email,
    authorized.email,
  );
  TestValidator.equals(
    "organization owner display name matches",
    retrievedOrganization.owner.displayName,
    authorized.display_name,
  );
}
