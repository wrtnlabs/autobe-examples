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
 * Test organization settings update by organization owner.
 *
 * Validates the complete organization update workflow including member registration, organization creation, and settings modification by the owner. Ensures that all configurable fields (name, description, logo URL, currency, timezone, fiscal start month) can be updated successfully and that the response contains the correct updated values.
 *
 * The test verifies that the organization owner (member with org:manage permission) can modify organization configuration, and that the updated_at timestamp reflects the modification time while the organization ID remains constant.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member creates a new organization with initial settings.
 * 3. Owner updates all organization settings with new values.
 * 4. Validates updated organization contains all new field values.
 * 5. Validates updated_at timestamp is later than created_at.
 * 6. Validates organization ID remains unchanged after update.
 */
export async function test_api_organization_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration and authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPass123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create organization with initial settings
  const initialData: IHrmPlatformOrganization.ICreate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    logo_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    currency: "USD",
    timezone: "America/New_York",
    fiscal_start_month: 1,
  } satisfies IHrmPlatformOrganization.ICreate;
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      { body: initialData },
    );
  typia.assert(organization);
  // 3. Update organization settings with new values
  const updateData: IHrmPlatformOrganization.IUpdate = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    logo_url: typia.random<string & tags.MaxLength<80000> & tags.Format<"uri">>(),
    currency: "EUR",
    timezone: "Europe/London",
    fiscal_start_month: 4,
  } satisfies IHrmPlatformOrganization.IUpdate;
  const updatedOrganization =
    await api.functional.hrmPlatform.member.organizations.update(
      memberConnection,
      {
        organizationId: organization.id,
        body: updateData,
      },
    );
  typia.assert(updatedOrganization);
  // 4. Validate all updated fields contain new values
  TestValidator.equals(
    "name updated",
    updatedOrganization.name,
    updateData.name,
  );
  TestValidator.equals(
    "description updated",
    updatedOrganization.description,
    updateData.description,
  );
  TestValidator.equals(
    "logo_url updated",
    updatedOrganization.logoUrl,
    updateData.logo_url,
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
    "fiscal_start_month updated",
    updatedOrganization.fiscalStartMonth,
    updateData.fiscal_start_month,
  );
  // 5. Validate timestamps
  TestValidator.equals(
    "organization id unchanged",
    updatedOrganization.id,
    organization.id,
  );
  TestValidator.predicate("updated_at is later than created_at", () => {
    return (
      new Date(updatedOrganization.updatedAt).getTime() >
      new Date(updatedOrganization.createdAt).getTime()
    );
  });
  TestValidator.predicate("updated_at changed from original", () => {
    return (
      new Date(updatedOrganization.updatedAt).getTime() >
      new Date(organization.createdAt).getTime()
    );
  });
}