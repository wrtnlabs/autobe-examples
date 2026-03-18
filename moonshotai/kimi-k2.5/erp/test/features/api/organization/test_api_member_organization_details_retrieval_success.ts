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

export async function test_api_member_organization_details_retrieval_success(
  connection: api.IConnection,
) {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(authorizedMember);
  // 2. Create a new organization as the authenticated member
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      { body: {} },
    );
  typia.assert(organization);
  // 3. Retrieve the organization details
  const retrievedOrganization =
    await api.functional.erpHrm.member.organizations.at(memberConnection, {
      organizationId: organization.id,
    });
  typia.assert(retrievedOrganization);
  // 4. Validate retrieved data matches created organization
  TestValidator.equals(
    "organization id matches",
    retrievedOrganization.id,
    organization.id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedOrganization.name,
    organization.name,
  );
  TestValidator.equals(
    "organization description matches",
    retrievedOrganization.description,
    organization.description,
  );
  TestValidator.equals(
    "organization currency matches",
    retrievedOrganization.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone matches",
    retrievedOrganization.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "organization fiscal_year_start_month matches",
    retrievedOrganization.fiscal_year_start_month,
    organization.fiscal_year_start_month,
  );
  TestValidator.equals(
    "organization owner matches",
    retrievedOrganization.owner.id,
    authorizedMember.id,
  );
}
