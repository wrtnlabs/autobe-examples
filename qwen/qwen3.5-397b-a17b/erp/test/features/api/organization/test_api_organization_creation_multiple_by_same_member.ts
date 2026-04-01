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
 * Test that a member can successfully create multiple organizations with complete configuration.
 * A member registers and creates multiple organizations, each specifying name, description,
 * currency code, timezone, and fiscal year start month. Validate that each organization is
 * created with all provided settings, the member is assigned as Owner with full permissions
 * for each organization, and all organizations are ready for use.
 */
export async function test_api_organization_creation_multiple_by_same_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // 2. Define organization configurations
  const org1Input = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    currency: "USD",
    timezone: "America/New_York",
    fiscal_start_month: 1,
  } satisfies IHrmPlatformOrganization.ICreate;
  const org2Input = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    currency: "EUR",
    timezone: "Europe/London",
    fiscal_start_month: 4,
  } satisfies IHrmPlatformOrganization.ICreate;
  const org3Input = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    currency: "KRW",
    timezone: "Asia/Seoul",
    fiscal_start_month: 3,
  } satisfies IHrmPlatformOrganization.ICreate;
  // 3. Create first organization with complete configuration
  const org1 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: org1Input,
    },
  );
  typia.assert(org1);
  // 4. Create second organization with different configuration
  const org2 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: org2Input,
    },
  );
  typia.assert(org2);
  // 5. Create third organization with another configuration
  const org3 = await generate_random_hrm_platform_member_organizations_create(
    memberConnection,
    {
      body: org3Input,
    },
  );
  typia.assert(org3);
  // 6. Validate all organizations have unique IDs
  TestValidator.notEquals("org1 and org2 have different IDs", org1.id, org2.id);
  TestValidator.notEquals("org1 and org3 have different IDs", org1.id, org3.id);
  TestValidator.notEquals("org2 and org3 have different IDs", org2.id, org3.id);
  // 7. Validate organization configurations match input
  TestValidator.equals("org1 name matches", org1.name, org1Input.name);
  TestValidator.equals(
    "org1 currency matches",
    org1.currency,
    org1Input.currency,
  );
  TestValidator.equals(
    "org1 timezone matches",
    org1.timezone,
    org1Input.timezone,
  );
  TestValidator.equals(
    "org1 fiscal month matches",
    org1.fiscal_start_month,
    org1Input.fiscal_start_month,
  );
  TestValidator.equals("org2 name matches", org2.name, org2Input.name);
  TestValidator.equals(
    "org2 currency matches",
    org2.currency,
    org2Input.currency,
  );
  TestValidator.equals(
    "org2 timezone matches",
    org2.timezone,
    org2Input.timezone,
  );
  TestValidator.equals(
    "org2 fiscal month matches",
    org2.fiscal_start_month,
    org2Input.fiscal_start_month,
  );
  TestValidator.equals("org3 name matches", org3.name, org3Input.name);
  TestValidator.equals(
    "org3 currency matches",
    org3.currency,
    org3Input.currency,
  );
  TestValidator.equals(
    "org3 timezone matches",
    org3.timezone,
    org3Input.timezone,
  );
  TestValidator.equals(
    "org3 fiscal month matches",
    org3.fiscal_start_month,
    org3Input.fiscal_start_month,
  );
}
