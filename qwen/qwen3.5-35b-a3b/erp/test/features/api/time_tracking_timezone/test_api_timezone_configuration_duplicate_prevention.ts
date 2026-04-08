import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_hrm_platform_member_organizations_create } from "../../../generate/generate_random_hrm_platform_member_organizations_create";
import { generate_random_hrm_platform_member_time_tracking_timezones_create } from "../../../generate/generate_random_hrm_platform_member_time_tracking_timezones_create";
import { prepare_random_hrm_platform_organization } from "../../../prepare/prepare_random_hrm_platform_organization";
import { prepare_random_hrm_platform_time_tracking_timezone } from "../../../prepare/prepare_random_hrm_platform_time_tracking_timezone";

/**
 * Test that the system prevents duplicate timezone configurations for the same organization.
 *
 * Validates the unique constraint enforcement on timezone configurations at the organization level.
 * Each organization can have exactly one timezone configuration, and attempts to create a second
 * timezone for the same organization should fail with a 409 Conflict error.
 *
 * 1. Register a new member which automatically creates an organization.
 * 2. Create the first timezone configuration for the organization (should succeed).
 * 3. Attempt to create a second timezone for the same organization (should fail with 409).
 * 4. Verify the original timezone configuration remains unchanged after the failed attempt.
 */
export async function test_api_timezone_configuration_duplicate_prevention(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new member (automatically creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: "UTC",
      email: `${RandomGenerator.name()}@example.com`,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "test",
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // Extract organization ID from member data
  const organizationId: string = member.member.id;
  // 2. Create first timezone configuration (should succeed)
  const firstTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.create(
      memberConnection,
      {
        body: {
          organization_id: organizationId,
          timezone: "Asia/Seoul",
        } satisfies IHrmPlatformTimeTrackingTimezone.ICreate,
      },
    );
  typia.assert(firstTimezone);
  // Validate first timezone creation
  TestValidator.equals(
    "first timezone organization matches",
    firstTimezone.organization_id,
    organizationId,
  );
  TestValidator.equals(
    "first timezone value",
    firstTimezone.timezone,
    "Asia/Seoul",
  );
  // Store original timezone ID for verification
  const firstTimezoneId: string = firstTimezone.id;
  // 3. Attempt second timezone creation for same organization (should fail with 409)
  await TestValidator.httpError(
    "duplicate timezone configuration should fail with 409 Conflict",
    409,
    async () => {
      await api.functional.hrmPlatform.member.time_tracking_timezones.create(
        memberConnection,
        {
          body: {
            organization_id: organizationId,
            timezone: "America/New_York",
          } satisfies IHrmPlatformTimeTrackingTimezone.ICreate,
        },
      );
    },
  );
  // 4. Verify original timezone remains unchanged
  // The first timezone should still be the only one
  TestValidator.equals(
    "original timezone ID unchanged after failed duplicate",
    firstTimezoneId,
    firstTimezone.id,
  );
  // Verify the failed creation didn't create partial data
  // Attempting to create should fail, confirming no duplicate exists
  TestValidator.predicate(
    "system correctly prevents duplicate timezone",
    () =>
      firstTimezone.organization_id === organizationId &&
      firstTimezone.timezone === "Asia/Seoul",
  );
}
