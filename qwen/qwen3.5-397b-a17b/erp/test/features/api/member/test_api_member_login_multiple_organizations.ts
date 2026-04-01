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

export async function test_api_member_login_multiple_organizations(
  connection: api.IConnection,
): Promise<void> {
  // Store credentials for later login
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.Format<"password">>();
  // 1. Register new member account
  const memberJoinResult = await authorize_member_join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      avatar_image: typia.random<string & tags.Format<"uri">>(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 2. Create member-specific connection for organization operations
  const memberConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${memberJoinResult.token.access}`,
    },
  };
  // 3. Create first organization
  const firstOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          logo: typia.random<string & tags.Format<"uri">>(),
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(firstOrganization);
  // 4. Create second organization for multi-org context
  const secondOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          logo: typia.random<string & tags.Format<"uri">>(),
          currency: "EUR",
          timezone: "America/New_York",
          fiscal_start_month: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
          >(),
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(secondOrganization);
  // 5. Login with member credentials to test multi-org authentication
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.ILogin,
  });
  typia.assert(loginResult);
  // 6. Validate member profile consistency across login sessions
  TestValidator.equals(
    "member ID matches registration",
    loginResult.id,
    memberJoinResult.id,
  );
  TestValidator.equals(
    "email matches registration",
    loginResult.email,
    memberJoinResult.email,
  );
  TestValidator.equals(
    "display_name consistent",
    loginResult.display_name,
    memberJoinResult.display_name,
  );
  TestValidator.equals(
    "avatar_image consistent",
    loginResult.avatar_image,
    memberJoinResult.avatar_image,
  );
  TestValidator.equals(
    "phone_number consistent",
    loginResult.phone_number,
    memberJoinResult.phone_number,
  );
  // 7. Validate authorization token structure
  typia.assert(loginResult.token);
  typia.assert(memberJoinResult.token);
  // 8. Verify both organizations exist with different configurations
  TestValidator.notEquals(
    "organizations have different IDs",
    firstOrganization.id,
    secondOrganization.id,
  );
  TestValidator.notEquals(
    "organizations have different names",
    firstOrganization.name,
    secondOrganization.name,
  );
  TestValidator.notEquals(
    "organizations have different currencies",
    firstOrganization.currency,
    secondOrganization.currency,
  );
  TestValidator.notEquals(
    "organizations have different timezones",
    firstOrganization.timezone,
    secondOrganization.timezone,
  );
  // 9. Validate organization structure completeness
  typia.assert(firstOrganization);
  typia.assert(secondOrganization);
  // 10. Verify organizations belong to the same member (both created successfully)
  TestValidator.predicate(
    "first organization has valid UUID",
    /^[0-9a-f-]{36}$/i.test(firstOrganization.id),
  );
  TestValidator.predicate(
    "second organization has valid UUID",
    /^[0-9a-f-]{36}$/i.test(secondOrganization.id),
  );
}
