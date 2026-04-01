import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import type { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import type { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import type { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import type { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import type { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import type { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import type { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTaskHistoryEntry";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_task_history_read_only_and_empty_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      name: RandomGenerator.name(),
      href: "https://example.com/erp/hrm-time/join",
      referrer: "https://example.com/erp/hrm-time/referrer",
      ip: null,
    } satisfies IErpHrmTimeMember.IJoin,
  });
  typia.assert(member);
  const projectId = typia.random<string & tags.Format<"uuid">>();
  const request: IErpHrmTimeTaskHistoryEntry.IRequest = {
    page: 1,
    limit: 20,
    sort: "-changedAt",
  };
  const firstResponse =
    await api.functional.erpHrmTime.member.projects.taskHistories.index(
      memberConnection,
      {
        projectId,
        body: request,
      },
    );
  typia.assert(firstResponse);
  TestValidator.equals(
    "empty history page current",
    firstResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty history page limit",
    firstResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty history page records",
    firstResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty history page pages",
    firstResponse.pagination.pages,
    0,
  );
  TestValidator.equals("empty history entries", firstResponse.data.length, 0);
  const secondResponse =
    await api.functional.erpHrmTime.member.projects.taskHistories.index(
      memberConnection,
      {
        projectId,
        body: request,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "history remains unchanged across reads",
    secondResponse.pagination,
    firstResponse.pagination,
  );
  TestValidator.equals(
    "history data remains unchanged across reads",
    secondResponse.data,
    firstResponse.data,
  );
}
