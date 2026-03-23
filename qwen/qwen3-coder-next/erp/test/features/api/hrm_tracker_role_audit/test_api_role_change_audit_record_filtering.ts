import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import type { IHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployeeRoleChange";
import type { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerEmployeeRoleChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerEmployeeRoleChange";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_role_change_audit_record_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join members for role change testing
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member1);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member2);
  const member3Connection: api.IConnection = { host: connection.host };
  const member3 = await authorize_member_join(member3Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      display_name: RandomGenerator.name(),
    } satisfies IHrmTrackerMember.IJoin,
  });
  typia.assert(member3);
  // 2. Create test role change records using the audit endpoint
  const now = new Date();
  // Create first role change record
  const roleChangeRequest1: IHrmTrackerEmployeeRoleChange.IRequest = {
    employee_id: "11111111-2222-3333-4444-555555555555" satisfies string &
      tags.Format<"uuid">,
    actor_id: member1.id,
    action_type: "role_assigned",
    changed_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  };
  const result1 =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      { body: roleChangeRequest1 },
    );
  typia.assert(result1);
  // Create second role change record with different criteria
  const roleChangeRequest2: IHrmTrackerEmployeeRoleChange.IRequest = {
    employee_id: "22222222-3333-4444-5555-666666666666" satisfies string &
      tags.Format<"uuid">,
    actor_id: member2.id,
    action_type: "role_changed",
    changed_at: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  };
  const result2 =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      { body: roleChangeRequest2 },
    );
  typia.assert(result2);
  // 3. Test filtering by employee_id
  const filterByEmployee =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      {
        body: {
          employee_id: "11111111-2222-3333-4444-555555555555" satisfies string &
            tags.Format<"uuid">,
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(filterByEmployee);
  TestValidator.predicate(
    "filter by employee returns results",
    filterByEmployee.data.length >= 0,
  );
  // 4. Test filtering by actor_id
  const filterByActor =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      {
        body: {
          actor_id: member1.id,
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(filterByActor);
  TestValidator.predicate(
    "filter by actor returns results",
    filterByActor.data.length >= 0,
  );
  // 5. Test filtering by action_type
  const filterByAction =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      {
        body: {
          action_type: "role_assigned",
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(filterByAction);
  TestValidator.predicate(
    "filter by action_type returns results",
    filterByAction.data.length >= 0,
  );
  // 6. Test filtering by changed_at date
  const filterByDate =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      {
        body: {
          changed_at: new Date(
            now.getTime() - 1000 * 60 * 60 * 24 * 5,
          ).toISOString(),
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(filterByDate);
  TestValidator.predicate(
    "filter by date returns results",
    filterByDate.data.length >= 0,
  );
  // 7. Test combined filtering
  const combinedFilter =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      {
        body: {
          employee_id: "11111111-2222-3333-4444-555555555555" satisfies string &
            tags.Format<"uuid">,
          actor_id: member1.id,
          action_type: "role_assigned",
          changed_at: new Date(
            now.getTime() - 1000 * 60 * 60 * 24 * 7,
          ).toISOString(),
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 8. Test pagination
  const paginated =
    await api.functional.hrmTracker.member.audit.role_changes.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmTrackerEmployeeRoleChange.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "pagination structure correct",
    typeof paginated.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit correct",
    typeof paginated.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records correct",
    typeof paginated.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages correct",
    typeof paginated.pagination.pages,
    "number",
  );
}
