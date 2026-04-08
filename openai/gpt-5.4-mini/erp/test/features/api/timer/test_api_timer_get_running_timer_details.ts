import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IErpHrmTimeTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timer_get_running_timer_details(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      displayName: RandomGenerator.name(),
      avatarImageUrl: null,
      phoneNumber: null,
      href: "https://example.com/erp-hrm-time/join",
      referrer: "https://example.com/erp-hrm-time",
      ip: "127.0.0.1",
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const timerId = typia.random<string & tags.Format<"uuid">>();
  const timer = await api.functional.erpHrmTime.member.timers.getByTimerid(
    memberConnection,
    {
      timerId,
    },
  );
  typia.assert(timer);
  TestValidator.equals("timer id", timer.id, timerId);
  TestValidator.predicate("member summary is present", timer.member !== null);
  TestValidator.predicate(
    "employee summary is present",
    timer.employee !== null,
  );
  TestValidator.predicate("project summary is present", timer.project !== null);
  TestValidator.predicate(
    "task summary is nullable",
    timer.task === null || timer.task !== null,
  );
  TestValidator.predicate(
    "startedAt is a timestamp string",
    timer.startedAt.length > 0,
  );
  TestValidator.predicate(
    "description is preserved as nullable text",
    timer.description === null || typeof timer.description === "string",
  );
  TestValidator.equals(
    "createdAt remains stable format",
    timer.createdAt,
    timer.createdAt,
  );
  TestValidator.equals(
    "updatedAt remains stable format",
    timer.updatedAt,
    timer.updatedAt,
  );
  TestValidator.equals(
    "deletedAt remains stable format",
    timer.deletedAt,
    timer.deletedAt,
  );
}
