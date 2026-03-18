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

/**
 * Test that a member can create multiple organizations and maintain ownership of all.
 *
 * This test validates:
 * 1. Member registration and authentication
 * 2. First organization creation with unique settings
 * 3. Second organization creation with different settings
 * 4. Both organizations have distinct IDs
 * 5. Same member is owner of both organizations
 * 6. Organization settings are independent and isolated
 */
export async function test_api_organization_multiple_ownership(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(authResult);
  // 2. Create first organization with unique settings
  const firstOrg =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(firstOrg);
  // 3. Create second organization with different settings
  const secondOrg =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          currency: "EUR",
          timezone: "Europe/Berlin",
          fiscal_start_month: 4,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(secondOrg);
  // 4. Verify both organizations have distinct IDs
  TestValidator.notEquals(
    "organizations have distinct IDs",
    firstOrg.id,
    secondOrg.id,
  );
  // 5. Verify same member is owner of both organizations
  TestValidator.equals(
    "first org owner ID",
    firstOrg.owner.id,
    authResult.member.id,
  );
  TestValidator.equals(
    "second org owner ID",
    secondOrg.owner.id,
    authResult.member.id,
  );
  TestValidator.equals(
    "both orgs have same owner",
    firstOrg.owner.id,
    secondOrg.owner.id,
  );
  // 6. Verify organization settings are independent
  TestValidator.notEquals(
    "organization names differ",
    firstOrg.name,
    secondOrg.name,
  );
  TestValidator.notEquals(
    "organization currencies differ",
    firstOrg.currency,
    secondOrg.currency,
  );
  TestValidator.notEquals(
    "organization timezones differ",
    firstOrg.timezone,
    secondOrg.timezone,
  );
  TestValidator.notEquals(
    "organization fiscal months differ",
    firstOrg.fiscal_start_month,
    secondOrg.fiscal_start_month,
  );
  // 7. Verify specific settings match what was created
  TestValidator.equals("first org currency", firstOrg.currency, "USD");
  TestValidator.equals("second org currency", secondOrg.currency, "EUR");
  TestValidator.equals(
    "first org timezone",
    firstOrg.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "second org timezone",
    secondOrg.timezone,
    "Europe/Berlin",
  );
  TestValidator.equals(
    "first org fiscal month",
    firstOrg.fiscal_start_month,
    1,
  );
  TestValidator.equals(
    "second org fiscal month",
    secondOrg.fiscal_start_month,
    4,
  );
  // 8. Verify owner details are consistent across both organizations
  TestValidator.equals(
    "owner email matches",
    firstOrg.owner.email,
    authResult.member.email,
  );
  TestValidator.equals(
    "owner display name matches",
    firstOrg.owner.display_name,
    authResult.member.display_name,
  );
  TestValidator.equals(
    "owner email consistent",
    firstOrg.owner.email,
    secondOrg.owner.email,
  );
  TestValidator.equals(
    "owner display name consistent",
    firstOrg.owner.display_name,
    secondOrg.owner.display_name,
  );
}
