import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import type { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import type { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import type { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import type { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import type { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function test_api_organization_settings_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new member and get authenticated connection
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // Step 2: Create an organization with specific settings
  const orgName = `Org-${RandomGenerator.alphaNumeric(8)}`;
  const organization =
    await generate_random_erp_hrm_member_organizations_create(
      memberConnection,
      {
        body: {
          name: orgName,
          currency: "USD",
          timezone: "America/New_York",
          fiscal_start_month: 1 as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<12>,
        },
      },
    );
  typia.assert(organization);
  // Step 3: Full update - modify all mutable fields
  const newName = `Updated-Org-${RandomGenerator.alphaNumeric(8)}`;
  const newDescription = RandomGenerator.paragraph({ sentences: 3 });
  const newLogoUrl = "https://example.com/new-logo.png" as string &
    tags.Format<"uri">;
  const newCurrency = "EUR";
  const newTimezone = "Asia/Seoul";
  const newFiscalStartMonth = 4 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<12>;
  const updateBody = {
    name: newName,
    description: newDescription,
    logo_url: newLogoUrl,
    currency: newCurrency,
    timezone: newTimezone,
    fiscal_start_month: newFiscalStartMonth,
  } satisfies IErpHrmOrganization.IUpdate;
  const updated = await api.functional.erpHrm.member.organizations.update(
    memberConnection,
    {
      organizationId: organization.id,
      body: updateBody,
    },
  );
  typia.assert(updated);
  // Validate full update response
  TestValidator.equals(
    "organization id unchanged",
    updated.id,
    organization.id,
  );
  TestValidator.equals("organization name updated", updated.name, newName);
  TestValidator.equals(
    "organization description updated",
    updated.description,
    newDescription,
  );
  TestValidator.equals(
    "organization logo_url updated",
    updated.logo_url,
    newLogoUrl,
  );
  TestValidator.equals(
    "organization currency updated",
    updated.currency,
    newCurrency,
  );
  TestValidator.equals(
    "organization timezone updated",
    updated.timezone,
    newTimezone,
  );
  TestValidator.equals(
    "organization fiscal_start_month updated",
    updated.fiscal_start_month,
    newFiscalStartMonth,
  );
  TestValidator.equals(
    "organization deleted_at is null",
    updated.deleted_at,
    null,
  );
  TestValidator.predicate(
    "updated_at is >= created_at",
    new Date(updated.updated_at) >= new Date(updated.created_at),
  );
  TestValidator.equals(
    "owner member id unchanged",
    updated.owner.member.id,
    authorized.member.id,
  );
  TestValidator.equals(
    "owner member email unchanged",
    updated.owner.member.email,
    authorized.member.email,
  );
  // Step 4: Partial update - modify only description
  const partialDescription = RandomGenerator.paragraph({ sentences: 2 });
  const partialUpdateBody = {
    description: partialDescription,
  } satisfies IErpHrmOrganization.IUpdate;
  const partialUpdated =
    await api.functional.erpHrm.member.organizations.update(memberConnection, {
      organizationId: organization.id,
      body: partialUpdateBody,
    });
  typia.assert(partialUpdated);
  // Validate partial update: only description changed, other fields remain from full update
  TestValidator.equals(
    "partial update: description changed",
    partialUpdated.description,
    partialDescription,
  );
  TestValidator.equals(
    "partial update: name unchanged",
    partialUpdated.name,
    newName,
  );
  TestValidator.equals(
    "partial update: currency unchanged",
    partialUpdated.currency,
    newCurrency,
  );
  TestValidator.equals(
    "partial update: timezone unchanged",
    partialUpdated.timezone,
    newTimezone,
  );
  TestValidator.equals(
    "partial update: fiscal_start_month unchanged",
    partialUpdated.fiscal_start_month,
    newFiscalStartMonth,
  );
  TestValidator.equals(
    "partial update: logo_url unchanged",
    partialUpdated.logo_url,
    newLogoUrl,
  );
  TestValidator.equals(
    "partial update: id unchanged",
    partialUpdated.id,
    organization.id,
  );
  TestValidator.equals(
    "partial update: deleted_at still null",
    partialUpdated.deleted_at,
    null,
  );
}
