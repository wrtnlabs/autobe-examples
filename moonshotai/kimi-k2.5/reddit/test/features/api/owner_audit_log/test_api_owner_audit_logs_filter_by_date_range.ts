import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeOwnerAuditLog";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import type { IRedditLikeOwnerAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwnerAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

export async function test_api_owner_audit_logs_filter_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner connection and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Define date range for filtering (past week)
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const createdAtFrom = oneWeekAgo.toISOString();
  const createdAtTo = now.toISOString();
  // 3. Call audit-logs endpoint with date range filter
  const response = await api.functional.redditLike.owner.audit_logs.index(
    ownerConnection,
    {
      body: {
        createdAtFrom,
        createdAtTo,
      } satisfies IRedditLikeOwnerAuditLog.IRequest,
    },
  );
  typia.assert(response);
  // 4. Validate that returned audit logs fall within the specified date range
  for (const log of response.data) {
    const logDate = new Date(log.created_at).getTime();
    const fromDate = new Date(createdAtFrom).getTime();
    const toDate = new Date(createdAtTo).getTime();
    TestValidator.predicate(
      "audit log created_at within date range",
      logDate >= fromDate && logDate <= toDate,
    );
  }
}
