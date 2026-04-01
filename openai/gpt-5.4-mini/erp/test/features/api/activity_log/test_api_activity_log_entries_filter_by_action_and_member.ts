import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeActivityLogEntry";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeActivityLogEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeActivityLogEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_activity_log_entries_filter_by_action_and_member(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const activityConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: member.token.access,
    },
  };
  const baseline =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      activityConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(baseline);
  TestValidator.predicate(
    "baseline pagination limit is positive",
    baseline.pagination.limit > 0,
  );
  TestValidator.predicate(
    "baseline page count is non-negative",
    baseline.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "baseline record count is non-negative",
    baseline.pagination.records >= 0,
  );
  TestValidator.predicate(
    "baseline data length does not exceed limit",
    baseline.data.length <= baseline.pagination.limit,
  );
  const actionTypeFilter =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      activityConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "employee.invited",
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(actionTypeFilter);
  TestValidator.equals(
    "action-type filtered pagination current",
    actionTypeFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "action-type filtered pagination limit",
    actionTypeFilter.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "action-type filtered data length fits pagination",
    actionTypeFilter.data.length <= actionTypeFilter.pagination.limit,
  );
  TestValidator.predicate(
    "action-type filtered entries match requested action type when present",
    actionTypeFilter.data.every(
      (entry) => entry.actionType === "employee.invited",
    ),
  );
  const memberFilter =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      activityConnection,
      {
        body: {
          page: 1,
          limit: 10,
          memberId: member.id,
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(memberFilter);
  TestValidator.equals(
    "member-filtered pagination current",
    memberFilter.pagination.current,
    1,
  );
  TestValidator.equals(
    "member-filtered pagination limit",
    memberFilter.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "member-filtered data length fits pagination",
    memberFilter.data.length <= memberFilter.pagination.limit,
  );
  const emptyResult =
    await api.functional.erpHrmTime.member.activity_log_entries.index(
      activityConnection,
      {
        body: {
          page: 1,
          limit: 10,
          actionType: "__nonexistent_action_type__",
          memberId: member.id,
        } satisfies IErpHrmTimeActivityLogEntry.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result pagination current",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty result pagination limit",
    emptyResult.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty result records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals("empty result pages", emptyResult.pagination.pages, 0);
  TestValidator.equals("empty result data length", emptyResult.data.length, 0);
}
