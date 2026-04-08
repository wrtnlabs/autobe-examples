import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformActivityLog";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformMemberEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberEmailVerification";
import type { IHrmPlatformMemberPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberPasswordReset";
import type { IHrmPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMemberSession";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_logs_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  const currentTime = new Date();
  const tenMinutesAgo = new Date(currentTime.getTime() - 10 * 60 * 1000);
  const fiveMinutesAgo = new Date(currentTime.getTime() - 5 * 60 * 1000);
  const memberConnection: api.IConnection = { host: connection.host };
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
    org_name: RandomGenerator.name(),
    org_currency: RandomGenerator.pick(["USD", "EUR", "KRW"]),
    org_description: RandomGenerator.paragraph(),
    org_logo_uri: typia.random<string & tags.Format<"uri">>(),
    org_timezone: RandomGenerator.pick(["UTC", "Asia/Seoul"]),
    org_fiscal_month: RandomGenerator.pick([1, 4, 7, 10]),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: joinInput,
  });
  typia.assert(memberAuth);
  typia.assert(memberAuth.member);
  const memberSummary = memberAuth.member;
  await api.functional.hrmPlatform.auth.member.login(memberConnection, {
    body: {
      email: memberAuth.email,
      password: joinInput.password,
    },
  });
  const allLogs = await api.functional.hrmPlatform.member.activity_logs.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
      },
    },
  );
  typia.assert(allLogs);
  if (allLogs.data.length === 0) {
    TestValidator.predicate(
      "activity logs should contain member registration log",
      () => allLogs.data.length >= 1,
    );
    return;
  }
  TestValidator.equals(
    "all logs pagination current",
    allLogs.pagination.current,
    1,
  );
  TestValidator.equals(
    "all logs pagination limit",
    allLogs.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "all logs pagination records >= 1",
    allLogs.pagination.records >= 1,
  );
  TestValidator.predicate(
    "all logs pagination pages >= 1",
    allLogs.pagination.pages >= 1,
  );
  const firstLog = allLogs.data[0];
  typia.assert(firstLog);
  const entityLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          entity_type: firstLog.entity_type,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(entityLogs);
  TestValidator.equals(
    "entity_type filter returns matching logs",
    entityLogs.data.every((log) => log.entity_type === firstLog.entity_type),
    true,
  );
  const actionTypeLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          action_type: firstLog.action_type,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(actionTypeLogs);
  TestValidator.equals(
    "action_type filter returns matching logs",
    actionTypeLogs.data.every(
      (log) => log.action_type === firstLog.action_type,
    ),
    true,
  );
  const actionNameLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          action_name: firstLog.action_name,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(actionNameLogs);
  TestValidator.equals(
    "action_name filter returns matching logs",
    actionNameLogs.data.every(
      (log) => log.action_name === firstLog.action_name,
    ),
    true,
  );
  if (firstLog.member_id) {
    const memberFilterLogs =
      await api.functional.hrmPlatform.member.activity_logs.index(
        memberConnection,
        {
          body: {
            member_id: firstLog.member_id,
            page: 1,
            limit: 20,
          },
        },
      );
    typia.assert(memberFilterLogs);
    if (memberFilterLogs.data.length > 0) {
      TestValidator.equals(
        "member_id filter returns matching logs",
        memberFilterLogs.data.every(
          (log) => log.member_id === firstLog.member_id,
        ),
        true,
      );
    }
  }
  const timeFromLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          from: tenMinutesAgo.toISOString(),
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(timeFromLogs);
  const fromTimeLogsValid = timeFromLogs.data.every(
    (log) => new Date(log.created_at) >= tenMinutesAgo,
  );
  TestValidator.equals(
    "from filter returns logs >= from timestamp",
    fromTimeLogsValid,
    true,
  );
  const timeToLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          to: fiveMinutesAgo.toISOString(),
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(timeToLogs);
  const toTimeLogsValid = timeToLogs.data.every(
    (log) => new Date(log.created_at) <= fiveMinutesAgo,
  );
  TestValidator.equals(
    "to filter returns logs <= to timestamp",
    toTimeLogsValid,
    true,
  );
  const combinedLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          entity_type: firstLog.entity_type,
          action_type: firstLog.action_type,
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedLogs);
  const combinedValid = combinedLogs.data.every(
    (log) =>
      log.entity_type === firstLog.entity_type &&
      log.action_type === firstLog.action_type,
  );
  TestValidator.equals(
    "combined filters return intersection of all conditions",
    combinedValid,
    true,
  );
  const combinedTimeLogs =
    await api.functional.hrmPlatform.member.activity_logs.index(
      memberConnection,
      {
        body: {
          entity_type: firstLog.entity_type,
          from: tenMinutesAgo.toISOString(),
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(combinedTimeLogs);
  const combinedTimeValid = combinedTimeLogs.data.every(
    (log) =>
      log.entity_type === firstLog.entity_type &&
      new Date(log.created_at) >= tenMinutesAgo,
  );
  TestValidator.equals(
    "combined time and entity_type filters work correctly",
    combinedTimeValid,
    true,
  );
}
