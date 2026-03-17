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

/**
 * Test that a newly registered owner with no activity history retrieves an empty audit log
 * with proper pagination structure showing zero total records and pages.
 */
export async function test_api_owner_audit_log_empty_activity_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new owner account (no activity history)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {});
  // 2. Retrieve audit log for owner with no activity
  const response: IPageIRedditLikeOwnerAuditLog.ISummary =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: {} satisfies IRedditLikeOwnerAuditLog.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", response.data.length, 0);
  // 4. Validate pagination structure with zero records
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records is zero",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is zero",
    response.pagination.pages,
    0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    response.pagination.limit > 0,
  );
  // 5. Verify consistent response structure (no null pagination)
  TestValidator.predicate("pagination exists", response.pagination !== null);
  TestValidator.predicate("data exists", response.data !== null);
}
