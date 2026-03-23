import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import type { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test the primary success path for updating an organization's configuration settings.
 * 1. Register and authenticate as organization owner
 * 2. Update organization settings with all fields (name, description, currency, timezone, fiscal_year_start_month, image_url)
 * 3. Verify the response contains updated organization with joined settings and logo data
 * 4. Validate all updated fields are correctly stored
 */
export async function test_api_organization_update_settings_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as organization owner
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Prepare update body with all fields
  const updateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    currency: RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP"]),
    timezone: RandomGenerator.pick([
      "Asia/Seoul",
      "America/New_York",
      "Europe/London",
      "UTC",
    ]),
    fiscal_year_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    image_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IHrmPlatformOrganization.IUpdate;
  // 3. Update organization settings (assuming member owns organization with same ID)
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: member.id,
        body: updateBody,
      },
    );
  typia.assert(updatedOrganization);
  // 4. Validate organization name is updated
  TestValidator.equals(
    "organization name updated",
    updatedOrganization.name,
    updateBody.name,
  );
  // 5. Validate description is updated
  TestValidator.equals(
    "organization description updated",
    updatedOrganization.description,
    updateBody.description,
  );
  // 6. Validate currency is stored in settings
  TestValidator.equals(
    "currency stored in settings",
    updatedOrganization.settings.currency,
    updateBody.currency,
  );
  // 7. Validate timezone is stored in settings
  TestValidator.equals(
    "timezone stored in settings",
    updatedOrganization.settings.timezone,
    updateBody.timezone,
  );
  // 8. Validate fiscal year start month is stored in settings
  TestValidator.equals(
    "fiscal year start month stored in settings",
    updatedOrganization.settings.fiscal_year_start_month,
    updateBody.fiscal_year_start_month,
  );
  // 9. Validate logo image URL is stored
  TestValidator.equals(
    "logo image URL stored",
    updatedOrganization.logo.image_url,
    updateBody.image_url,
  );
  // 10. Validate updated_at timestamp exists
  TestValidator.predicate(
    "updated_at timestamp exists",
    updatedOrganization.updated_at !== null,
  );
  // 11. Validate owner is the authenticated member
  TestValidator.equals(
    "owner matches authenticated member",
    updatedOrganization.owner.id,
    member.id,
  );
  // 12. Validate organization is active (not deleted)
  TestValidator.equals(
    "organization is active",
    updatedOrganization.deleted_at,
    null,
  );
}
