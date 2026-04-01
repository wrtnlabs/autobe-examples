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

export async function test_api_organization_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      display_name: RandomGenerator.name(),
      href: "",
      referrer: "",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create organization with complete initial settings
  const originalName = RandomGenerator.paragraph({ sentences: 2 });
  const originalDescription = RandomGenerator.content({ paragraphs: 2 });
  const originalCurrency = "USD";
  const originalTimezone = "America/New_York";
  const originalFiscalStartMonth = 1;
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: originalName,
          description: originalDescription,
          logo: typia.random<string & tags.Format<"uri">>(),
          currency: originalCurrency,
          timezone: originalTimezone,
          fiscal_start_month: originalFiscalStartMonth,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Update only the logo field (partial update)
  const newLogo = typia.random<string & tags.Format<"uri">>();
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          logo: newLogo,
        } satisfies IHrmPlatformOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrganization);
  // 4. Verify partial update behavior - only logo changed
  TestValidator.equals("logo updated", updatedOrganization.logo, newLogo);
  TestValidator.equals(
    "name unchanged",
    updatedOrganization.name,
    originalName,
  );
  TestValidator.equals(
    "description unchanged",
    updatedOrganization.description,
    originalDescription,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedOrganization.currency,
    originalCurrency,
  );
  TestValidator.equals(
    "timezone unchanged",
    updatedOrganization.timezone,
    originalTimezone,
  );
  TestValidator.equals(
    "fiscal_start_month unchanged",
    updatedOrganization.fiscal_start_month,
    originalFiscalStartMonth,
  );
  TestValidator.notEquals(
    "updated_at changed",
    organization.updated_at,
    updatedOrganization.updated_at,
  );
}