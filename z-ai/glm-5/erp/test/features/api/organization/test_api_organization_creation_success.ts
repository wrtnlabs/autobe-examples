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

export async function test_api_organization_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member using join operation
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create organization with all required fields
  const orgName = RandomGenerator.paragraph({ sentences: 2 });
  const orgBody = {
    name: orgName,
    currency: "USD",
    timezone: "America/New_York",
    fiscalStartMonth: 1,
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IErpHrmOrganization.ICreate;
  const organization = await api.functional.erpHrm.member.organizations.create(
    memberConnection,
    { body: orgBody },
  );
  typia.assert(organization);
  // 3. Validate submitted fields match the request
  TestValidator.equals("name matches", organization.name, orgBody.name);
  TestValidator.equals(
    "currency matches",
    organization.currency,
    orgBody.currency,
  );
  TestValidator.equals(
    "timezone matches",
    organization.timezone,
    orgBody.timezone,
  );
  TestValidator.equals(
    "fiscalStartMonth matches",
    organization.fiscalStartMonth,
    orgBody.fiscalStartMonth,
  );
  TestValidator.equals(
    "description matches",
    organization.description,
    orgBody.description,
  );
  // 4. Validate owner is the authenticated member
  TestValidator.equals(
    "owner.id matches member.id",
    organization.owner.id,
    member.id,
  );
  TestValidator.equals(
    "owner.email matches member.email",
    organization.owner.email,
    member.email,
  );
  TestValidator.equals(
    "owner.displayName matches member.display_name",
    organization.owner.displayName,
    member.display_name,
  );
  // 5. Validate system-generated fields (business logic checks)
  TestValidator.equals("deletedAt is null", organization.deletedAt, null);
}
