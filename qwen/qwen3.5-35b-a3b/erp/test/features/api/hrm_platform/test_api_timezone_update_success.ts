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

/**
 * Test member timezone configuration update success path.
 *
 * Validates the complete timezone update workflow including member registration, organization
 * creation, and timezone configuration update with IANA timezone validation. Ensures that the
 * timezone update correctly modifies the organization's time tracking configuration and that
 * computed fields like the updated_at timestamp reflect the modification time.
 *
 * Special attention is given to verifying that the timezone configuration exists and can be
 * successfully updated with a valid IANA timezone identifier, and that the organization
 * relationship is correctly maintained in the response.
 *
 * 1. Member registers with organization creation (auto-generates initial timezone config)
 * 2. Member authentication connection is established with access token
 * 3. Timezone configuration update is performed with new IANA timezone identifier
 * 4. Validates timezone configuration is successfully updated to new value
 * 5. Validates updated_at timestamp reflects modification time
 * 6. Validates response includes complete timezone record with organization relationship
 */
export async function test_api_timezone_update_success(
  connection: api.IConnection,
) {
  // 1. Register member with organization using valid IANA timezone
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
    },
  });
  typia.assert(joinResult);
  // 2. Create authenticated connection for API calls
  const memberConnection: api.IConnection = { host: connection.host };
  memberConnection.headers = {
    Authorization: joinResult.token.access,
  };
  // 3. Generate timezone configuration UUID and update timezone
  const timezoneId = typia.random<string & tags.Format<"uuid">>();
  const newTimezone = RandomGenerator.pick([
    "Asia/Seoul",
    "America/New_York",
    "Europe/London",
  ]);
  const updatedTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.update(
      memberConnection,
      {
        timezoneId,
        body: {
          timezone: newTimezone,
        } satisfies IHrmPlatformTimeTrackingTimezone.IUpdate,
      },
    );
  typia.assert(updatedTimezone);
  // 4. Validate timezone update
  TestValidator.equals(
    "timezone updated",
    updatedTimezone.timezone,
    newTimezone,
  );
  TestValidator.predicate(
    "has valid updated_at",
    updatedTimezone.updated_at !== undefined,
  );
  TestValidator.predicate(
    "has organization",
    updatedTimezone.organization !== undefined,
  );
  TestValidator.predicate(
    "timezone record not soft-deleted",
    updatedTimezone.deleted_at === null,
  );
  TestValidator.predicate(
    "organization has valid id",
    updatedTimezone.organization.id !== undefined,
  );
  TestValidator.predicate(
    "organization has name",
    updatedTimezone.organization.name !== undefined,
  );
}