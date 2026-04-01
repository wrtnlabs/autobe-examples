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

export async function test_api_organization_update_fiscal_settings(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization with initial fiscal settings
  const initialCurrency = "USD";
  const initialTimezone = "America/New_York";
  const initialFiscalStartMonth = 1 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          logo: typia.random<string & tags.Format<"uri">>(),
          currency: initialCurrency,
          timezone: initialTimezone,
          fiscal_start_month: initialFiscalStartMonth,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // 3. Update fiscal settings only (currency, timezone, fiscal_start_month)
  const newCurrency = "EUR";
  const newTimezone = "Europe/London";
  const newFiscalStartMonth = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          currency: newCurrency,
          timezone: newTimezone,
          fiscal_start_month: newFiscalStartMonth,
        } satisfies IHrmPlatformOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrganization);
  // 4. Verify fiscal settings are updated
  TestValidator.equals(
    "currency updated",
    updatedOrganization.currency,
    newCurrency,
  );
  TestValidator.equals(
    "timezone updated",
    updatedOrganization.timezone,
    newTimezone,
  );
  TestValidator.equals(
    "fiscal_start_month updated",
    updatedOrganization.fiscal_start_month,
    newFiscalStartMonth,
  );
  // 5. Verify identity fields remain unchanged
  TestValidator.equals(
    "name unchanged",
    updatedOrganization.name,
    organization.name,
  );
  TestValidator.equals(
    "description unchanged",
    updatedOrganization.description ?? null,
    organization.description ?? null,
  );
  TestValidator.equals(
    "logo unchanged",
    updatedOrganization.logo ?? null,
    organization.logo ?? null,
  );
  // 6. Verify timestamps are updated
  TestValidator.notEquals(
    "updated_at changed",
    updatedOrganization.updated_at,
    organization.updated_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedOrganization.created_at,
    organization.created_at,
  );
}
