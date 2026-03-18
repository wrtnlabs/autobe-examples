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

export async function test_api_organization_update_partial_timezone(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      firstName: RandomGenerator.name(1),
      lastName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Create organization with initial values - omitting optional fields
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: "GlobalTech",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_year_start_month: 1,
        },
      },
    );
  typia.assert(organization);
  const originalCreatedAt = organization.created_at;
  const originalUpdatedAt = organization.updated_at;
  // Partial update - only timezone field
  const updated = await api.functional.erpHrm.member.organizations.update(
    memberConnection,
    {
      organizationId: organization.id,
      body: {
        timezone: "Asia/Seoul",
      } satisfies IErpHrmOrganization.IUpdate,
    },
  );
  typia.assert(updated);
  // Validate partial update semantics - only timezone changed
  TestValidator.equals(
    "timezone updated to Asia/Seoul",
    updated.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals("name unchanged", updated.name, "GlobalTech");
  TestValidator.equals("currency unchanged", updated.currency, "USD");
  TestValidator.equals(
    "fiscal_year_start_month unchanged",
    updated.fiscal_year_start_month,
    1,
  );
  TestValidator.equals("description remains null", updated.description, null);
  TestValidator.equals("logo_url remains null", updated.logo_url, null);
  TestValidator.equals("id unchanged", updated.id, organization.id);
  TestValidator.equals(
    "owner unchanged",
    updated.owner.id,
    organization.owner.id,
  );
  TestValidator.equals(
    "created_at unchanged",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at reflects update time",
    new Date(updated.updated_at) > new Date(originalUpdatedAt),
  );
}
