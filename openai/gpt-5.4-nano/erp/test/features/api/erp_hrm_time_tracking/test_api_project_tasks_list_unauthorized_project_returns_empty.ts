import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingMember";
import type { IErpHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingProject";
import type { IErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTask";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIErpHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_project_tasks_list_unauthorized_project_returns_empty(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password_123!",
    organizationName: RandomGenerator.name(),
    organizationDescription: RandomGenerator.paragraph({ sentences: 2 }),
    organizationLogoUrl: null,
    organizationCurrencyCode: "USD",
    organizationTimezone: "Asia/Seoul",
    organizationFiscalStartMonth: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<12>
    >(),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/ref" satisfies string & tags.Format<"uri">,
    ip: undefined,
  } satisfies IErpHrmTimeTrackingMember.IJoin;
  await authorize_member_join(memberConnection, { body: joinPayload });
  const unauthorizedProjectId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.erpHrmTimeTracking.member.projects.tasks.index(
      memberConnection,
      {
        projectId: unauthorizedProjectId,
        body: {
          page: 1,
          limit: 10,
          title: undefined,
          description: null,
          status: undefined,
          priority: undefined,
          assignedEmployeeId: undefined,
          parentTaskId: undefined,
          dueDateFrom: null,
          dueDateTo: null,
          estimatedHoursFrom: null,
          estimatedHoursTo: null,
          sortBy: undefined,
          sortOrder: undefined,
        } satisfies IErpHrmTimeTrackingTask.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
  TestValidator.equals("tasks list should be empty", response.data.length, 0);
}
