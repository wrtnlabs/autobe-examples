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

export async function test_api_time_tracking_data_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Member A with Organization A
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAResult = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAResult);
  // 2. Register Member B with Organization C
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBResult = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_description: RandomGenerator.paragraph(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberBResult);
  // 3. Member B creates timezone for Organization C (memberBResult.member belongs to Org C)
  // Note: memberBResult.member.id is the MEMBER id, not org id
  // We need to get Organization C's ID from memberBResult's sessions or another source
  // For now, we'll use the organization from the member summary
  const orgCId: string = memberBResult.member.id; // This is wrong - member.id is user ID
  // Actually, we need to find Organization C's ID
  // The join response doesn't directly return organization id
  // We need to create Organization C explicitly or use the first organization
  // Let's use generate_random_hrm_platform_member_organizations_create to create Org C for Member B
  const memberBCorg =
    await generate_random_hrm_platform_member_organizations_create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.name(),
          currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
          timezone: RandomGenerator.pick([
            "UTC",
            "Asia/Seoul",
            "America/New_York",
          ]),
          fiscal_start_month: RandomGenerator.pick([1, 4, 7, 10]),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(memberBCorg);
  // 4. Member B creates timezone for Organization C
  const orgCTimezone =
    await generate_random_hrm_platform_member_time_tracking_timezones_create(
      memberBConnection,
      {
        body: {
          organization_id: memberBCorg.id,
          timezone: RandomGenerator.pick([
            "Asia/Seoul",
            "America/New_York",
            "Europe/London",
          ]),
        },
      },
    );
  typia.assert(orgCTimezone);
  // 5. Member A attempts to retrieve Member B's timezone - should return 404
  await TestValidator.error(
    "Member A cannot access Member B's organization timezone",
    async () => {
      await api.functional.hrmPlatform.member.time_tracking_timezones.at(
        memberAConnection,
        {
          timezoneId: orgCTimezone.id,
        },
      );
    },
  );
}
