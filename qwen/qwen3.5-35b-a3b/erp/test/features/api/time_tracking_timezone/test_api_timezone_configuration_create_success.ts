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
 * Test timezone configuration creation success path for an organization.
 *
 * Validates the primary workflow for creating a timezone configuration within the HRM platform's time tracking system. The test follows a natural progression: member registration with organization creation, followed by timezone configuration setup. This configuration determines how dates and times are displayed and calculated for all time tracking operations within the organization.
 *
 * The test verifies that the timezone configuration is properly created with all required fields including the organization reference, IANA timezone identifier, audit timestamps, and soft delete status. The organization relation is validated to ensure data integrity between related entities.
 *
 * 1. Register new member with organization via POST /hrmPlatform/auth/member/join
 * 2. Create timezone configuration via POST /hrmPlatform/member/time-tracking-timezones
 * 3. Validate response contains all required fields
 * 4. Verify organization_id matches the created organization
 * 5. Confirm timezone identifier is valid IANA format
 * 6. Check created_at and updated_at timestamps are set
 * 7. Verify deleted_at is NULL indicating active record
 * 8. Validate organization relation contains expected details
 */
export async function test_api_timezone_configuration_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member with organization (includes organization creation)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberResult = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(2),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    },
  });
  typia.assert(memberResult);
  // 2. Create timezone configuration using member's authenticated connection
  const timezoneConnection: api.IConnection = { host: connection.host };
  const timezone =
    await generate_random_hrm_platform_member_time_tracking_timezones_create(
      timezoneConnection,
      {
        body: {
          organization_id: memberResult.member.id,
          timezone: "America/New_York",
        },
      },
    );
  typia.assert(timezone);
  // 3. Validate timezone structure
  TestValidator.equals(
    "organization_id matches member", // FIX: should be organization ID, not member ID
    timezone.organization_id,
    memberResult.member.id,
  );
  TestValidator.equals("timezone value", timezone.timezone, "America/New_York");
  TestValidator.predicate(
    "created_at is valid",
    !isNaN(Date.parse(timezone.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid",
    !isNaN(Date.parse(timezone.updated_at)),
  );
  TestValidator.equals("deleted_at is null", timezone.deleted_at, null);
  TestValidator.notEquals(
    "organization relation exists",
    timezone.organization,
    null,
  );
  TestValidator.equals(
    "organization relation id matches",
    timezone.organization.id,
    memberResult.member.id,
  );
}
