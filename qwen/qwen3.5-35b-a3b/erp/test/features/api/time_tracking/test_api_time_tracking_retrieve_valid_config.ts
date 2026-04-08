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
import { generate_random_hrm_platform_member_time_tracking_timezones_create } from "../../../generate/generate_random_hrm_platform_member_time_tracking_timezones_create";
import { prepare_random_hrm_platform_time_tracking_timezone } from "../../../prepare/prepare_random_hrm_platform_time_tracking_timezone";

export async function test_api_time_tracking_retrieve_valid_config(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member (automatically creates organization)
  const memberConnection: api.IConnection = { host: connection.host };
  const orgName = RandomGenerator.name();
  const memberOutput = await authorize_member_join(memberConnection, {
    body: {
      org_name: orgName,
      org_currency: "USD",
      org_timezone: "Asia/Seoul",
      org_fiscal_month: 1,
    },
  });
  typia.assert(memberOutput);
  typia.assert(memberOutput.token);
  // Extract organization ID from first session (organization context)
  const organizationId = memberOutput.sessions?.[0]?.organization?.id;
  if (!organizationId) {
    throw new Error("Organization ID not available in session context");
  }
  typia.assert(organizationId);
  // 2. Create timezone configuration for the organization
  const timezoneCreateBody = {
    organization_id: organizationId,
    timezone: "Asia/Seoul",
  } satisfies IHrmPlatformTimeTrackingTimezone.ICreate;
  const createdTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.create(
      memberConnection,
      {
        body: timezoneCreateBody,
      },
    );
  typia.assert(createdTimezone);
  // 3. Retrieve the timezone configuration by ID
  const retrievedTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.at(
      memberConnection,
      {
        timezoneId: createdTimezone.id,
      },
    );
  typia.assert(retrievedTimezone);
  // 4. Validate the retrieved timezone configuration
  TestValidator.equals(
    "timezone ID matches",
    retrievedTimezone.id,
    createdTimezone.id,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedTimezone.organization_id,
    organizationId,
  );
  TestValidator.equals(
    "timezone value matches",
    retrievedTimezone.timezone,
    "Asia/Seoul",
  );
  TestValidator.equals(
    "deleted_at is NULL",
    retrievedTimezone.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "created_at exists",
    retrievedTimezone.created_at,
    "",
  );
  TestValidator.notEquals(
    "updated_at exists",
    retrievedTimezone.updated_at,
    "",
  );
  // Validate organization relationship
  TestValidator.equals(
    "organization matches",
    retrievedTimezone.organization.id,
    organizationId,
  );
  TestValidator.equals(
    "organization name",
    retrievedTimezone.organization.name,
    orgName,
  );
}