import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingActivityLog";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingActivityLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingActivityLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_manager_join } from "../../../authorize/authorize_manager_join";
import { authorize_manager_login } from "../../../authorize/authorize_manager_login";
import { authorize_manager_refresh } from "../../../authorize/authorize_manager_refresh";

export async function test_api_activity_log_search_requires_manager_authorization(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = { host: connection.host };
  const authorized: IHrmTimeTrackingManager.IAuthorized =
    await authorize_manager_join(managerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  typia.assert(authorized);
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const body = {
    actorType: RandomGenerator.pick(["manager", "employee", "owner"] as const),
    actionType: RandomGenerator.paragraph({ sentences: 2 }),
    targetEntity: RandomGenerator.paragraph({ sentences: 2 }),
    targetEntityId: typia.random<string & tags.Format<"uuid">>(),
    search: RandomGenerator.paragraph({ sentences: 3 }),
    startCreatedAt: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    endCreatedAt: new Date().toISOString(),
    sort: "-created_at",
    page: 1,
    limit: 10,
  } satisfies IHrmTimeTrackingActivityLog.IRequest;
  await TestValidator.httpError(
    "manager authorization is required for activity log search",
    [401, 403],
    async () => {
      await api.functional.hrmTimeTracking.manager.activityLogs.search(
        unauthenticatedConnection,
        {
          body,
        },
      );
    },
  );
}
