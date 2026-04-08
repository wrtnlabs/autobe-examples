import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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

export async function test_api_organization_creation_multiple_organizations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuthorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuthorized);
  // 2. MemberConnection already has Authorization header updated by authorize_member_join
  // 3. Get owner ID for validation
  const ownerId: string = memberAuthorized.member.id;
  // 4. Create first organization with specific configuration
  const firstOrg: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(firstOrg);
  // 5. Create second organization with different configuration
  const secondOrg: IHrmPlatformOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph(),
          currency: "EUR",
          timezone: "America/New_York",
          fiscal_start_month: 4,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(secondOrg);
  // 6. Validate both organizations reference the same owner
  TestValidator.equals(
    "first org owner ID matches member ID",
    firstOrg.owner.id,
    ownerId,
  );
  TestValidator.equals(
    "second org owner ID matches member ID",
    secondOrg.owner.id,
    ownerId,
  );
  // 7. Validate organizations have unique names
  TestValidator.notEquals(
    "organization names are unique",
    firstOrg.name,
    secondOrg.name,
  );
  // 8. Validate independent configurations
  TestValidator.equals("first org currency is USD", firstOrg.currency, "USD");
  TestValidator.equals("second org currency is EUR", secondOrg.currency, "EUR");
  TestValidator.equals(
    "first org timezone is Asia/Seoul",
    firstOrg.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "second org timezone is America/New_York",
    secondOrg.timezone,
    "America/New_York",
  );
  TestValidator.equals(
    "first org fiscal start month is 1",
    firstOrg.fiscal_start_month,
    1,
  );
  TestValidator.equals(
    "second org fiscal start month is 4",
    secondOrg.fiscal_start_month,
    4,
  );
  // 9. Validate organizations have different IDs
  TestValidator.notEquals(
    "organizations have unique IDs",
    firstOrg.id,
    secondOrg.id,
  );
}
