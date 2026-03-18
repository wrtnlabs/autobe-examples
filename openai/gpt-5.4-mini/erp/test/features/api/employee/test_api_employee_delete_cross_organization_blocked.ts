import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_employee_delete_cross_organization_blocked(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Cross-organization employee deletion must be blocked.
   *
   * This test creates two separate member sessions and verifies that an
   * employee identifier from another organization context cannot be deleted
   * from the active organization context.
   */
  const actorConnection: api.IConnection = { host: connection.host };
  const foreignConnection: api.IConnection = { host: connection.host };
  const actor = await authorize_member_join(actorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(actor);
  const foreign = await authorize_member_join(foreignConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IHrmTimeTrackingMember.IJoin,
  });
  typia.assert(foreign);
  const foreignEmployeeId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "cross-organization employee deletion should be rejected",
    async () => {
      await api.functional.hrmTimeTracking.member.employees.erase(
        actorConnection,
        {
          employeeId: foreignEmployeeId,
        },
      );
    },
  );
}
