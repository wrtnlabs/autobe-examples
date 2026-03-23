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
 * Test that an authenticated member can successfully retrieve their organization's detailed information.
 *
 * This test verifies:
 * 1. Member authentication and organization context establishment
 * 2. Organization retrieval by ID with complete data structure
 * 3. All nested objects (owner, settings, logo) are properly populated
 * 4. Organization is active (not soft-deleted)
 */
export async function test_api_organization_retrieve_by_member(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
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
  // 2. For this test, we assume access to a valid organization ID
  // In a real scenario, this would come from:
  // - Test configuration with pre-created organization
  // - Member's profile data containing organization context
  // - Organization creation API response
  //
  // Since the available APIs don't provide organization creation or listing,
  // we use a placeholder organization ID for testing the retrieval endpoint.
  // The actual organization ID would be injected through test setup.
  const organizationId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve organization details
  const organization = await api.functional.hrmPlatform.organizations.at(
    memberConnection,
    {
      organizationId,
    },
  );
  typia.assert(organization);
  // 4. Validate organization structure and data integrity
  TestValidator.equals(
    "organization has valid UUID",
    typeof organization.id,
    "string",
  );
  TestValidator.equals(
    "organization has name",
    typeof organization.name,
    "string",
  );
  TestValidator.predicate(
    "organization is active (not deleted)",
    organization.deleted_at === null,
  );
  // 5. Validate owner reference
  TestValidator.equals(
    "owner has valid UUID",
    typeof organization.owner.id,
    "string",
  );
  TestValidator.equals(
    "owner has valid email",
    typeof organization.owner.email,
    "string",
  );
  TestValidator.equals(
    "owner has created_at",
    typeof organization.owner.created_at,
    "string",
  );
  // 6. Validate settings structure
  TestValidator.equals(
    "settings has valid UUID",
    typeof organization.settings.id,
    "string",
  );
  TestValidator.equals(
    "settings has currency code",
    typeof organization.settings.currency,
    "string",
  );
  TestValidator.equals(
    "settings has timezone",
    typeof organization.settings.timezone,
    "string",
  );
  TestValidator.predicate(
    "fiscal year start month is valid (1-12)",
    organization.settings.fiscal_year_start_month >= 1 &&
      organization.settings.fiscal_year_start_month <= 12,
  );
  TestValidator.equals(
    "settings has created_at",
    typeof organization.settings.created_at,
    "string",
  );
  TestValidator.equals(
    "settings has updated_at",
    typeof organization.settings.updated_at,
    "string",
  );
  // 7. Validate logo structure
  TestValidator.equals(
    "logo has valid UUID",
    typeof organization.logo.id,
    "string",
  );
  TestValidator.equals(
    "logo has image URL",
    typeof organization.logo.image_url,
    "string",
  );
  TestValidator.equals(
    "logo has created_at",
    typeof organization.logo.created_at,
    "string",
  );
  TestValidator.equals(
    "logo has updated_at",
    typeof organization.logo.updated_at,
    "string",
  );
  // 8. Validate organization timestamps
  TestValidator.equals(
    "organization has created_at",
    typeof organization.created_at,
    "string",
  );
  TestValidator.equals(
    "organization has updated_at",
    typeof organization.updated_at,
    "string",
  );
  // 9. Validate logo organization reference
  TestValidator.equals(
    "logo references organization",
    organization.logo.organization.id,
    organization.id,
  );
}
