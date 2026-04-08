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
 * Test that a member can successfully retrieve their own organization's complete details.
 *
 * Validates the complete organization retrieval flow including member authentication, organization creation, and organization details retrieval. Ensures that the organization response includes all configuration settings and that the organization ID matches the created organization.
 *
 * Special attention is given to verifying that all organization settings are correctly preserved: name, description, logo URL, currency, timezone, fiscal start month, and timestamps. The member must be able to access their own organization as the owner.
 *
 * 1. Member registers with email and password using authorize_member_join utility.
 * 2. Member creates an organization using generate_random_hrm_platform_member_organizations_create utility, becoming the owner.
 * 3. Member retrieves the organization by ID using api.functional.hrmPlatform.member.organizations.at.
 * 4. Validates all organization fields: id, name, description, logoUrl, currency, timezone, fiscalStartMonth, createdAt, updatedAt.
 * 5. Verifies the retrieved organization ID matches the created organization ID.
 * 6. Ensures all settings are correctly preserved and returned.
 */
export async function test_api_organization_retrieve_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member registration
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  // 2. Create organization
  const organization =
    await generate_random_hrm_platform_member_organizations_create(
      memberConnection,
      {},
    );
  typia.assert(organization);
  // 3. Retrieve organization by ID
  const retrieved = await api.functional.hrmPlatform.member.organizations.at(
    memberConnection,
    {
      organizationId: organization.id,
    },
  );
  typia.assert(retrieved);
  // 4. Validate all organization fields match
  TestValidator.equals("organization ID", retrieved.id, organization.id);
  TestValidator.equals("organization name", retrieved.name, organization.name);
  TestValidator.equals(
    "organization description",
    retrieved.description,
    organization.description,
  );
  TestValidator.equals(
    "organization logo URL",
    retrieved.logoUrl,
    organization.logoUrl,
  );
  TestValidator.equals(
    "organization currency",
    retrieved.currency,
    organization.currency,
  );
  TestValidator.equals(
    "organization timezone",
    retrieved.timezone,
    organization.timezone,
  );
  TestValidator.equals(
    "organization fiscal start month",
    retrieved.fiscalStartMonth,
    organization.fiscalStartMonth,
  );
  TestValidator.equals(
    "organization created at",
    retrieved.createdAt,
    organization.createdAt,
  );
  TestValidator.equals(
    "organization updated at",
    retrieved.updatedAt,
    organization.updatedAt,
  );
}
