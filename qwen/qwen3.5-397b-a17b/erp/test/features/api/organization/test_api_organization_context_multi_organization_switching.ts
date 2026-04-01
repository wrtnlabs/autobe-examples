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
 * Test organization context retrieval for a member belonging to multiple organizations.
 * After member registration, create two organizations and ensure the member has employee records in both.
 * Select one organization context using the select endpoint, then retrieve the current organization.
 * Verify the returned organization matches the selected context.
 * Then switch to the second organization using the select endpoint and retrieve again.
 * Verify the response now contains the second organization's details.
 * This validates that organization context switching works correctly and the endpoint always returns
 * the currently selected organization, not a cached or default organization.
 */
export async function test_api_organization_context_multi_organization_switching(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration - creates authenticated member session
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth: IHrmPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IHrmPlatformMember.IJoin,
    });
  typia.assert(memberAuth);
  // 2. Create first organization - member automatically becomes employee with Owner role
  const firstOrganization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  // 3. Create second organization - member also becomes employee with Owner role
  const secondOrganization: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          currency: "KRW",
          timezone: "Asia/Seoul",
          fiscal_start_month: 3,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  // 4. Select first organization as active context
  const selectedFirst: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: firstOrganization.id,
      },
    );
  typia.assert(selectedFirst);
  // 5. Retrieve current organization context - should match first organization
  const currentAfterFirstSelect: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.my.at(
      memberConnection,
    );
  typia.assert(currentAfterFirstSelect);
  // 6. Verify first organization context is active
  TestValidator.equals(
    "first organization selected",
    currentAfterFirstSelect.id,
    firstOrganization.id,
  );
  TestValidator.equals(
    "first organization name matches",
    currentAfterFirstSelect.name,
    firstOrganization.name,
  );
  TestValidator.equals(
    "first organization currency matches",
    currentAfterFirstSelect.currency,
    firstOrganization.currency,
  );
  // 7. Select second organization as active context
  const selectedSecond: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.select(
      memberConnection,
      {
        organizationId: secondOrganization.id,
      },
    );
  typia.assert(selectedSecond);
  // 8. Retrieve current organization context - should now match second organization
  const currentAfterSecondSelect: IHrmPlatformOrganization =
    await api.functional.hrmPlatform.member.organizations.my.at(
      memberConnection,
    );
  typia.assert(currentAfterSecondSelect);
  // 9. Verify second organization context is active (switching worked)
  TestValidator.equals(
    "second organization selected",
    currentAfterSecondSelect.id,
    secondOrganization.id,
  );
  TestValidator.equals(
    "second organization name matches",
    currentAfterSecondSelect.name,
    secondOrganization.name,
  );
  TestValidator.equals(
    "second organization currency matches",
    currentAfterSecondSelect.currency,
    secondOrganization.currency,
  );
  TestValidator.notEquals(
    "organization changed",
    currentAfterFirstSelect.id,
    currentAfterSecondSelect.id,
  );
}