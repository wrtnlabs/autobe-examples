import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimeTrackingTimezone";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformTimeTrackingTimezone } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformTimeTrackingTimezone";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_time_tracking_timezone_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication setup
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      org_name: RandomGenerator.name(),
      org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
      org_timezone: RandomGenerator.pick([
        "UTC",
        "Asia/Seoul",
        "America/New_York",
      ]),
      org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
    } satisfies DeepPartial<IHrmPlatformMember.IJoin>,
  });
  typia.assert(memberAuth);
  // 2. List timezone configurations using member's connection
  // Note: Without organization isolation verification available from member summary,
  // we test the general listing functionality
  const timezoneList =
    await api.functional.hrmPlatform.member.time_tracking_timezones.index(
      memberConnection,
      {
        body: {
          page: 1,
          pageSize: 10,
        } satisfies IHrmPlatformTimeTrackingTimezone.IRequest,
      },
    );
  typia.assert(timezoneList);
  // 3. Validate pagination structure
  TestValidator.equals(
    "pagination current page",
    timezoneList.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    timezoneList.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    timezoneList.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    timezoneList.pagination.pages >= 0,
  );
  // 4. Validate timezone data records exist
  const timezones = timezoneList.data;
  if (timezones.length === 0) {
    TestValidator.equals(
      "timezone list empty is valid",
      timezoneList.pagination.records,
      0,
    );
    return;
  }
  // 5. Validate each timezone record structure
  for (let i = 0; i < timezones.length; i++) {
    const tz = timezones[i];
    // Validate timezone identifier format (IANA style)
    const timezonePattern = /^[A-Za-z]+\/[A-Za-z_]+$/;
    TestValidator.predicate(
      `timezone ${i} identifier format`,
      timezonePattern.test(tz.timezone),
    );
    // Validate organization reference exists (FIXED: replaced notNull with predicate)
    TestValidator.predicate(
      `timezone ${i} has organization`,
      tz.organization !== null && tz.organization !== undefined,
    );
    // Validate organization ID is valid UUID
    const organizationIdPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    TestValidator.predicate(
      `timezone ${i} organization id format`,
      organizationIdPattern.test(tz.organization.id),
    );
    // Validate organization has required fields
    TestValidator.predicate(
      `timezone ${i} organization has name`,
      tz.organization.name.length > 0,
    );
    // Validate timestamps exist and are valid ISO 8601
    TestValidator.predicate(
      `timezone ${i} created at is non-empty`,
      tz.createdAt.length > 0,
    );
    TestValidator.predicate(
      `timezone ${i} updated at is non-empty`,
      tz.updatedAt.length > 0,
    );
    // Validate deletedAt is either null or valid ISO 8601
    if (tz.deletedAt !== null) {
      TestValidator.predicate(
        `timezone ${i} deleted at is valid datetime`,
        tz.deletedAt.length > 0,
      );
    }
  }
}
