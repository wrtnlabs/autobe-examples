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

export async function test_api_organization_partial_update(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  const initialName = RandomGenerator.name();
  const initialDescription = RandomGenerator.paragraph({ sentences: 3 });
  const initialLogoUrl = typia.random<string & tags.Format<"uri">>();
  const initialCurrency = "USD";
  const initialTimezone = "America/New_York";
  const initialFiscalStartMonth = 1;
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {
        body: {
          name: initialName,
          description: initialDescription,
          logo_url: initialLogoUrl satisfies string & tags.Format<"uri"> as string & tags.MaxLength<80000> & tags.Format<"uri">,
          currency: initialCurrency,
          timezone: initialTimezone,
          fiscal_start_month: initialFiscalStartMonth,
        },
      },
    );
  typia.assert(organization);
  const updatedName = RandomGenerator.name();
  const updatedTimezone = "Asia/Seoul";
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: {
          name: updatedName,
          timezone: updatedTimezone,
        } satisfies IHrmPlatformOrganization.IUpdate,
      },
    );
  typia.assert(updatedOrganization);
  TestValidator.equals(
    "name is updated",
    updatedOrganization.name,
    updatedName,
  );
  TestValidator.equals(
    "timezone is updated",
    updatedOrganization.timezone,
    updatedTimezone,
  );
  TestValidator.equals(
    "description unchanged",
    updatedOrganization.description,
    initialDescription,
  );
  TestValidator.equals(
    "logo_url unchanged",
    updatedOrganization.logoUrl,
    initialLogoUrl,
  );
  TestValidator.equals(
    "currency unchanged",
    updatedOrganization.currency,
    initialCurrency,
  );
  TestValidator.equals(
    "fiscal_start_month unchanged",
    updatedOrganization.fiscalStartMonth,
    initialFiscalStartMonth,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedOrganization.createdAt,
    organization.createdAt,
  );
  TestValidator.predicate(
    "updated_at is later than created_at",
    () =>
      new Date(updatedOrganization.updatedAt) >
      new Date(updatedOrganization.createdAt),
  );
  TestValidator.predicate(
    "updated_at reflects modification",
    () =>
      new Date(updatedOrganization.updatedAt) >=
      new Date(organization.updatedAt),
  );
}