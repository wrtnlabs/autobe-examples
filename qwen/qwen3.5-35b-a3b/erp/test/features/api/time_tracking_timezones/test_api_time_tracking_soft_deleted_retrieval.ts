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

export async function test_api_time_tracking_soft_deleted_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member: IHrmPlatformMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        org_name: RandomGenerator.name(),
        org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
        org_timezone: RandomGenerator.pick([
          "UTC",
          "Asia/Seoul",
          "America/New_York",
        ]),
        href: RandomGenerator.alphaNumeric(16),
        referrer: RandomGenerator.alphaNumeric(16),
      } satisfies IHrmPlatformMember.IJoin,
    },
  );
  typia.assert(member);
  const timezone: IHrmPlatformTimeTrackingTimezone =
    await generate_random_hrm_platform_member_time_tracking_timezones_create(
      memberConnection,
      {
        body: {
          organization_id: member.member.id,
          timezone: RandomGenerator.alphabets(12),
        } satisfies IHrmPlatformTimeTrackingTimezone.ICreate,
      },
    );
  typia.assert(timezone);
  const retrievedTimezone: IHrmPlatformTimeTrackingTimezone =
    await api.functional.hrmPlatform.member.time_tracking_timezones.at(
      memberConnection,
      {
        timezoneId: timezone.id,
      },
    );
  typia.assert(retrievedTimezone);
  TestValidator.equals(
    "timezone ID matches",
    retrievedTimezone.id,
    timezone.id,
  );
  TestValidator.equals(
    "timezone name matches",
    retrievedTimezone.timezone,
    timezone.timezone,
  );
  TestValidator.equals(
    "organization ID matches",
    retrievedTimezone.organization_id,
    timezone.organization_id,
  );
  TestValidator.equals(
    "organization name matches",
    retrievedTimezone.organization.name,
    timezone.organization.name,
  );
}