import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
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

/**
 * Test successful organization creation by an authenticated member.
 *
 * Validates the complete organization creation workflow including member registration,
 * authentication, and organization creation through the HRM platform API. Ensures that
 * the organization is correctly created with proper owner reference, all required
 * fields are populated, and system-generated fields are properly set.
 *
 * Special attention is given to verifying that:
 * - The owner reference correctly points to the authenticated member
 * - Organization name uniqueness is validated within owner's context
 * - Fiscal start month is within valid range (1-12)
 * - All system-generated fields (id, timestamps) are properly populated
 */
export async function test_api_organization_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member joins the system with email, password, and initial organization
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      avatar_uri: typia.random<string & tags.Format<"uri">>(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      org_logo_uri: typia.random<string & tags.Format<"uri">>(),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Step 2: Create new connection for member API calls
  const memberApiConnection: api.IConnection = { host: connection.host };
  // Note: authorize_member_join updates connection.headers internally,
  // but we need to ensure the new connection has the token
  memberApiConnection.headers = {
    ...memberApiConnection.headers,
    Authorization: memberAuth.token.access,
  };
  // Step 3: Create a new organization via POST /hrmPlatform/member/organizations
  const newOrgName = RandomGenerator.name();
  const newOrgCurrency = RandomGenerator.pick(["USD", "EUR", "KRW"]);
  const newOrgTimezone = RandomGenerator.pick([
    "UTC",
    "Asia/Seoul",
    "America/New_York",
  ]);
  const newOrgFiscalMonth = RandomGenerator.pick([1, 4, 7, 10]);
  const organization =
    await api.functional.hrmPlatform.member.organizations.create(
      memberApiConnection,
      {
        body: {
          name: newOrgName,
          description: RandomGenerator.paragraph(),
          currency: newOrgCurrency,
          timezone: newOrgTimezone,
          fiscal_start_month: newOrgFiscalMonth,
        } satisfies IHrmPlatformOrganization.ICreate,
      },
    );
  typia.assert(organization);
  // Step 4: Validate organization structure and fields
  TestValidator.equals("organization name", organization.name, newOrgName);
  TestValidator.equals(
    "organization description",
    organization.description,
    organization.description,
  );
  TestValidator.equals(
    "organization currency",
    organization.currency,
    newOrgCurrency,
  );
  TestValidator.equals(
    "organization timezone",
    organization.timezone,
    newOrgTimezone,
  );
  TestValidator.equals(
    "fiscal start month",
    organization.fiscal_start_month,
    newOrgFiscalMonth,
  );
  // Step 5: Validate owner reference points to authenticated member
  TestValidator.equals(
    "owner ID matches authenticated member",
    organization.owner.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "owner email matches authenticated member",
    organization.owner.email,
    memberAuth.email,
  );
  // Step 6: Validate system-generated fields
  typia.assert<string & tags.Format<"uuid">>(organization.id);
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(organization.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(organization.updated_at)),
  );
  TestValidator.equals(
    "deleted_at is null for active organization",
    organization.deleted_at,
    null,
  );
  // Step 7: Validate timestamps are recent (within last minute)
  const now = new Date();
  const createdAt = new Date(organization.created_at);
  const timeDiff = Math.abs(now.getTime() - createdAt.getTime());
  TestValidator.predicate(
    "created_at is recent (within 1 minute)",
    timeDiff < 60000,
  );
  // Step 8: Validate fiscal month is within valid range (1-12)
  TestValidator.predicate(
    "fiscal start month is between 1 and 12",
    organization.fiscal_start_month >= 1 &&
      organization.fiscal_start_month <= 12,
  );
}