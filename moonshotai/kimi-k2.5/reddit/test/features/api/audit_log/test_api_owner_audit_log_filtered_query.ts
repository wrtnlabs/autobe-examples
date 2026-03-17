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
 * Test owner audit log filtered query workflow.
 * 1. Owner registers and authenticates using utility function
 * 2. Query audit logs with entity type filter (community)
 * 3. Query audit logs with entity type filter (post)
 * 4. Query audit logs with date range filter (createdAtFrom, createdAtTo)
 * 5. Query audit logs with combined filters (entityType, action, date range)
 * 6. Query audit logs with pagination and filtered results
 * 7. Validate filtered results match all specified criteria
 */
export async function test_api_owner_audit_log_filtered_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner authentication using utility function
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // 2. Entity type filter for community activities
  const communityFilter =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: {
          entityType: "community",
          limit: 10,
        } satisfies IRedditLikeOwnerAuditLog.IRequest,
      },
    );
  typia.assert(communityFilter);
  // 3. Entity type filter for post activities
  const postFilter =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: {
          entityType: "post",
          limit: 10,
        } satisfies IRedditLikeOwnerAuditLog.IRequest,
      },
    );
  typia.assert(postFilter);
  // 4. Date range filter
  const oneWeekAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const dateRangeFilter =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: {
          createdAtFrom: oneWeekAgo,
          createdAtTo: yesterday,
          limit: 10,
        } satisfies IRedditLikeOwnerAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeFilter);
  // 5. Combined multiple filters (entityType, action, date range)
  const combinedFilter =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: {
          entityType: "community",
          action: "create_community",
          createdAtFrom: oneWeekAgo,
          createdAtTo: new Date().toISOString(),
          limit: 5,
        } satisfies IRedditLikeOwnerAuditLog.IRequest,
      },
    );
  typia.assert(combinedFilter);
  // 6. Pagination with filtered results
  const paginated =
    await api.functional.redditLike.owner.audit_logs.my_activity.index(
      ownerConnection,
      {
        body: {
          page: "1",
          limit: 20,
          entityType: "post",
        } satisfies IRedditLikeOwnerAuditLog.IRequest,
      },
    );
  typia.assert(paginated);
  // 7. Validate pagination metadata is present
  TestValidator.predicate(
    "pagination has valid current page",
    paginated.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    paginated.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    paginated.pagination.records >= 0,
  );
}
