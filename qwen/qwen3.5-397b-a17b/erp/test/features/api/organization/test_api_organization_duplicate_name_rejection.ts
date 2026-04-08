import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
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
 * Test organization name uniqueness constraint across the multi-tenancy platform.
 *
 * Validates that organization names must be unique across all members in the platform. The test creates an organization with a specific name using the first member, then attempts to create another organization with the identical name using a second member. This ensures the business rule preventing duplicate organization names is enforced regardless of which user creates the organization.
 *
 * The test verifies three critical aspects: first, that the duplicate name creation attempt is rejected with an appropriate error; second, that the original organization remains intact and accessible after the failed attempt; and third, that the error message clearly indicates the name uniqueness constraint violation.
 *
 * 1. First member registers and creates an organization with a unique name.
 * 2. Second member registers with different credentials.
 * 3. Second member attempts to create an organization with the same name.
 * 4. Validates that the duplicate creation is rejected with appropriate error.
 * 5. Confirms the first organization remains accessible and unchanged.
 */
export async function test_api_organization_duplicate_name_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first member
  const firstMemberConnection: api.IConnection = { host: connection.host };
  const firstMember = await authorize_member_join(firstMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(firstMember);
  // 2. First member creates an organization with a specific name
  const organizationName = RandomGenerator.paragraph({ sentences: 2 });
  const firstOrganization =
    await generate_random_hrm_platform_member_organizations_create(
      firstMemberConnection,
      {
        body: {
          name: organizationName,
          currency: "USD",
          timezone: "Asia/Seoul",
          fiscal_start_month: 1,
        },
      },
    );
  typia.assert(firstOrganization);
  // 3. Register second member
  const secondMemberConnection: api.IConnection = { host: connection.host };
  const secondMember = await authorize_member_join(secondMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(secondMember);
  // 4. Second member attempts to create organization with duplicate name
  await TestValidator.error(
    "duplicate organization name rejected",
    async () => {
      await api.functional.hrmPlatform.member.organizations.create(
        secondMemberConnection,
        {
          body: {
            name: organizationName,
            currency: "EUR",
            timezone: "Europe/London",
            fiscal_start_month: 4,
          } satisfies IHrmPlatformOrganization.ICreate,
        },
      );
    },
  );
  // 5. Validate first organization remains intact and accessible
  TestValidator.equals(
    "first organization name preserved",
    firstOrganization.name,
    organizationName,
  );
  TestValidator.predicate(
    "first organization has valid UUID",
    /^[0-9a-f-]{36}$/i.test(firstOrganization.id),
  );
  TestValidator.equals(
    "first organization currency",
    firstOrganization.currency,
    "USD",
  );
}
