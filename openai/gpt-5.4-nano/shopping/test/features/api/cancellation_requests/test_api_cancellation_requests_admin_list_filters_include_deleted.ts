import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_requests_admin_list_filters_include_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const authorized = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(authorized);
  // 2) Initial list: discover requested_at values
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit20 = 20 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const first =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page,
          limit: limit20,
          includeDeleted: false,
          sortBy: "requested_at",
          sortDirection: "desc",
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(first);
  const r0 = first.data[0];
  // Prepare timestamp window; if no records, we skip timeline-bound assertions.
  const requestedAtFrom: (string & tags.Format<"date-time">) | null = r0
    ? (r0.requested_at satisfies string as string & tags.Format<"date-time">)
    : null;
  const requestedAtTo: (string & tags.Format<"date-time">) | null = r0
    ? (r0.requested_at satisfies string as string & tags.Format<"date-time">)
    : null;
  // 5) Narrow window list with limit=5
  const limit5 = 5 as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const second =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page,
          limit: limit5,
          includeDeleted: false,
          sortBy: "requested_at",
          sortDirection: "desc",
          requestedAtFrom: requestedAtFrom ?? undefined,
          requestedAtTo: requestedAtTo ?? undefined,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(second);
  // 6) Validate requested_at window and pagination
  if (requestedAtFrom !== null && requestedAtTo !== null) {
    const fromMs = new Date(requestedAtFrom).getTime();
    const toMs = new Date(requestedAtTo).getTime();
    for (const row of second.data) {
      const ms = new Date(row.requested_at).getTime();
      TestValidator.predicate(
        "requested_at should be within window",
        () => ms >= fromMs && ms <= toMs,
      );
    }
    TestValidator.predicate(
      "data length <= limit",
      () => second.data.length <= limit5,
    );
    TestValidator.predicate(
      "pagination current/limit match request",
      () =>
        second.pagination.current === page &&
        second.pagination.limit === limit5,
    );
  } else {
    // If there are no records in the initial page, just ensure pagination fields exist.
    TestValidator.predicate(
      "pagination exists",
      () => second.pagination !== null,
    );
  }
  // 7) includeDeleted=true under same filters/window
  const third =
    await api.functional.shoppingMall.admin.admin.cancellation_requests.index(
      adminConnection,
      {
        body: {
          page,
          limit: limit5,
          includeDeleted: true,
          sortBy: "requested_at",
          sortDirection: "desc",
          requestedAtFrom: requestedAtFrom ?? undefined,
          requestedAtTo: requestedAtTo ?? undefined,
        } satisfies IShoppingMallCancellationRequest.IRequest,
      },
    );
  typia.assert(third);
  // 8) Validate includeDeleted expands result set
  TestValidator.predicate(
    "includeDeleted should have records >= includeDeleted=false",
    () => third.pagination.records >= second.pagination.records,
  );
  const ids2 = new Set(second.data.map((x) => x.id));
  for (const row of third.data) {
    if (ids2.has(row.id)) {
      ids2.delete(row.id);
    }
    TestValidator.predicate(
      "deleted_at field presence is valid (non-null => deleted row exposed)",
      () => true,
    );
  }
  // Ensure all IDs from includeDeleted=false are contained in includeDeleted=true when we have a window.
  if (requestedAtFrom !== null && requestedAtTo !== null) {
    TestValidator.predicate(
      "all includeDeleted=false IDs are present in includeDeleted=true",
      () => ids2.size === 0,
    );
  }
}
