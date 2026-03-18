import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";

export async function test_api_organization_update_multi_organization_context(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authorized);
  // 2. Create first organization
  const org1 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "First Organization",
        currency: "KRW",
        timezone: "Asia/Seoul",
        fiscal_start_month: 3,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(org1);
  // 3. Create second organization under same owner
  const org2 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: {
        name: "Second Organization",
        currency: "JPY",
        timezone: "Asia/Tokyo",
        fiscal_start_month: 6,
      } satisfies IHrmPlatformOrganization.ICreate,
    },
  );
  typia.assert(org2);
  // 4. Update first organization with distinct settings
  const updatedOrg1 =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: org1.id,
        body: {
          name: "Org Alpha",
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrg1);
  // 5. Verify first organization reflects the updated values
  TestValidator.equals("org1 name updated", updatedOrg1.name, "Org Alpha");
  TestValidator.equals("org1 currency updated", updatedOrg1.currency, "USD");
  TestValidator.equals(
    "org1 timezone updated",
    updatedOrg1.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "org1 fiscal_start_month updated",
    updatedOrg1.fiscal_start_month,
    1,
  );
  TestValidator.notEquals("org1 id unchanged", updatedOrg1.id, org2.id);
  // 6. Verify second organization remains unchanged
  TestValidator.equals("org2 name unchanged", org2.name, "Second Organization");
  TestValidator.equals("org2 currency unchanged", org2.currency, "JPY");
  TestValidator.equals("org2 timezone unchanged", org2.timezone, "Asia/Tokyo");
  TestValidator.equals(
    "org2 fiscal_start_month unchanged",
    org2.fiscal_start_month,
    6,
  );
  // 7. Update second organization with different settings
  const updatedOrg2 =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: org2.id,
        body: {
          name: "Org Beta",
          currency: "EUR",
          timezone: "Europe/London",
          fiscal_start_month: 4,
        } satisfies IHrmPlatformOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrg2);
  // 8. Verify both organizations maintain independent configurations
  TestValidator.equals("org2 name updated", updatedOrg2.name, "Org Beta");
  TestValidator.equals("org2 currency updated", updatedOrg2.currency, "EUR");
  TestValidator.equals(
    "org2 timezone updated",
    updatedOrg2.timezone,
    "Europe/London",
  );
  TestValidator.equals(
    "org2 fiscal_start_month updated",
    updatedOrg2.fiscal_start_month,
    4,
  );
  TestValidator.notEquals(
    "org1 and org2 names differ",
    updatedOrg1.name,
    updatedOrg2.name,
  );
  TestValidator.notEquals(
    "org1 and org2 currencies differ",
    updatedOrg1.currency,
    updatedOrg2.currency,
  );
  TestValidator.notEquals(
    "org1 and org2 timezones differ",
    updatedOrg1.timezone,
    updatedOrg2.timezone,
  );
  TestValidator.notEquals(
    "org1 and org2 fiscal_start_month differ",
    updatedOrg1.fiscal_start_month,
    updatedOrg2.fiscal_start_month,
  );
}
