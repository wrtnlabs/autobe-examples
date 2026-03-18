import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import type { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import type { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import type { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import type { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import type { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import type { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import type { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_timelog_self_scope_organization_isolation(
  connection: api.IConnection,
): Promise<void> {
  const createMemberSession = async () => {
    const session: api.IConnection = { host: connection.host };
    const authorized = await authorize_member_join(session, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IHrmTimeTrackingMember.IJoin,
    });
    typia.assert(authorized);
    return { session, authorized };
  };
  const first = await createMemberSession();
  const firstResponse =
    await api.functional.hrmTimeTracking.member.me.timelogs.index(
      first.session,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "work_date_desc",
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(firstResponse);
  TestValidator.equals(
    "personal timelog pagination should honor the requested first page",
    firstResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "personal timelog pagination should honor the requested limit",
    firstResponse.pagination.limit,
    50,
  );
  TestValidator.predicate(
    "personal timelog results should be a valid page payload",
    firstResponse.pagination.records >= 0 &&
      firstResponse.pagination.pages >= 0,
  );
  await ArrayUtil.asyncForEach(firstResponse.data, async (timelog) => {
    typia.assert(timelog);
    TestValidator.equals(
      "every returned timelog must belong to the authenticated member",
      timelog.employee.id,
      first.authorized.id,
    );
  });
  const second = await createMemberSession();
  const secondResponse =
    await api.functional.hrmTimeTracking.member.me.timelogs.index(
      second.session,
      {
        body: {
          page: 1,
          limit: 50,
          sort: "work_date_desc",
        } satisfies IHrmTimeTrackingTimelog.IRequest,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "second personal timelog pagination should honor the requested first page",
    secondResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "second personal timelog pagination should honor the requested limit",
    secondResponse.pagination.limit,
    50,
  );
  await ArrayUtil.asyncForEach(secondResponse.data, async (timelog) => {
    typia.assert(timelog);
    TestValidator.equals(
      "second session must also remain scoped to its own employee",
      timelog.employee.id,
      second.authorized.id,
    );
  });
  TestValidator.notEquals(
    "independent member sessions should not share the same employee identity",
    first.authorized.id,
    second.authorized.id,
  );
}
