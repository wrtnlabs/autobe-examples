import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_erp_hrm_member_organizations_create } from "../../../generate/generate_random_erp_hrm_member_organizations_create";
import { prepare_random_erp_hrm_organization } from "../../../prepare/prepare_random_erp_hrm_organization";

/**
 * Test organization update by owner.
 *
 * Validates that an authenticated member who created an organization
 * can successfully update all modifiable fields including name,
 * description, logo image, currency, timezone, and fiscal start month.
 * Tests full updates, partial updates, and name uniqueness constraint.
 */
export async function test_api_organization_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  // Create initial organization (owner becomes the owner)
  const organization =
    await generate_random_erp_hrm_member_organizations_create(ownerConnection, {
      body: {
        name: RandomGenerator.name(),
        currency: "USD",
        timezone: "America/New_York",
        fiscalStartMonth: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
        >(),
      },
    });
  typia.assert(organization);
  // Test 1: Full update of all fields
  const updateData: IErpHrmOrganization.IUpdate = {
    name: `${RandomGenerator.name()} Updated`,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    logo_image: typia.random<string & tags.Format<"url">>(),
    currency: "EUR",
    timezone: "Asia/Seoul",
    fiscal_start_month: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
  };
  const updatedOrganization =
    await api.functional.erpHrm.member.organizations.update(ownerConnection, {
      organizationId: organization.id,
      body: updateData,
    });
  typia.assert(updatedOrganization);
  // Validate all updated fields
  TestValidator.equals(
    "name updated",
    updatedOrganization.name,
    updateData.name,
  );
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    updateData.description ?? null,
  );
  TestValidator.equals(
    "logoImage updated",
    updatedOrganization.logoImage,
    updateData.logo_image ?? null,
  );
  TestValidator.equals(
    "currency updated",
    updatedOrganization.currency,
    updateData.currency,
  );
  TestValidator.equals(
    "timezone updated",
    updatedOrganization.timezone,
    updateData.timezone,
  );
  TestValidator.equals(
    "fiscalStartMonth updated",
    updatedOrganization.fiscalStartMonth,
    updateData.fiscal_start_month!,
  );
  // Test 2: Owner relationship is correct
  TestValidator.equals(
    "owner id matches",
    updatedOrganization.owner.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "owner email matches",
    updatedOrganization.owner.email,
    ownerAuth.email,
  );
  TestValidator.equals(
    "owner displayName matches",
    updatedOrganization.owner.displayName,
    ownerAuth.display_name,
  );
  // Test 3: Partial update - only some fields
  const partialUpdateData: IErpHrmOrganization.IUpdate = {
    description: "Updated description only",
    currency: "KRW",
  };
  const partialUpdated =
    await api.functional.erpHrm.member.organizations.update(ownerConnection, {
      organizationId: organization.id,
      body: partialUpdateData,
    });
  typia.assert(partialUpdated);
  // Validate partial update preserved other fields
  TestValidator.equals(
    "description partially updated",
    partialUpdated.description,
    partialUpdateData.description ?? null,
  );
  TestValidator.equals(
    "currency partially updated",
    partialUpdated.currency,
    partialUpdateData.currency,
  );
  TestValidator.equals("name preserved", partialUpdated.name, updateData.name);
  TestValidator.equals(
    "timezone preserved",
    partialUpdated.timezone,
    updateData.timezone,
  );
  TestValidator.equals(
    "fiscalStartMonth preserved",
    partialUpdated.fiscalStartMonth,
    updateData.fiscal_start_month!,
  );
  // Test 4: Name uniqueness constraint - create another organization
  const secondOwnerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(secondOwnerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const secondOrganization =
    await generate_random_erp_hrm_member_organizations_create(
      secondOwnerConnection,
      {
        body: {
          name: "Unique Organization Name",
          currency: "USD",
          timezone: "America/Los_Angeles",
          fiscalStartMonth: 1,
        },
      },
    );
  typia.assert(secondOrganization);
  // Try to update first organization's name to match second organization's name
  await TestValidator.error(
    "duplicate organization name rejected",
    async () => {
      await api.functional.erpHrm.member.organizations.update(ownerConnection, {
        organizationId: organization.id,
        body: { name: secondOrganization.name },
      });
    },
  );
  // Test 5: Valid currency codes
  const currencyCodes = ["USD", "EUR", "KRW"] as const;
  for (const currency of currencyCodes) {
    const currencyUpdate =
      await api.functional.erpHrm.member.organizations.update(ownerConnection, {
        organizationId: organization.id,
        body: { currency },
      });
    typia.assert(currencyUpdate);
    TestValidator.equals(
      `currency ${currency} accepted`,
      currencyUpdate.currency,
      currency,
    );
  }
  // Test 6: Valid timezone identifiers
  const timezones = [
    "America/New_York",
    "Asia/Seoul",
    "Europe/London",
  ] as const;
  for (const timezone of timezones) {
    const timezoneUpdate =
      await api.functional.erpHrm.member.organizations.update(ownerConnection, {
        organizationId: organization.id,
        body: { timezone },
      });
    typia.assert(timezoneUpdate);
    TestValidator.equals(
      `timezone ${timezone} accepted`,
      timezoneUpdate.timezone,
      timezone,
    );
  }
  // Test 7: Fiscal start month validation (1-12)
  for (let month = 1; month <= 12; month++) {
    const monthUpdate = await api.functional.erpHrm.member.organizations.update(
      ownerConnection,
      {
        organizationId: organization.id,
        body: { fiscal_start_month: month },
      },
    );
    typia.assert(monthUpdate);
    TestValidator.equals(
      `fiscalStartMonth ${month} accepted`,
      monthUpdate.fiscalStartMonth,
      month,
    );
  }
}
