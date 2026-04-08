import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_snapshot_history_view(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Browse cancellation request snapshot history as an administrator.
   *
   * Validates that the administrator-only snapshot history endpoint returns a
   * paginated list of immutable cancellation request snapshots for a specific
   * order item and cancellation request pair.
   *
   * This test focuses on response shape, pagination metadata, and historical
   * snapshot preservation. Because the live cancellation request summary DTO is
   * empty in the provided definitions, the test intentionally limits itself to
   * fields guaranteed by the snapshot summary and page DTOs.
   *
   * 1. Authenticate as an administrator on an isolated connection.
   * 2. Request snapshot history using valid UUID route parameters and paging.
   * 3. Validate the page metadata and immutable snapshot summary fields.
   * 4. Confirm the returned data does not exceed the requested page size.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.index(
      administratorConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned records do not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  for (const snapshot of response.data) {
    typia.assert(snapshot);
    TestValidator.equals(
      "snapshot deletion marker remains null",
      snapshot.deletedAt,
      null,
    );
    TestValidator.predicate(
      "snapshot has a valid createdAt timestamp",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has a valid updatedAt timestamp",
      snapshot.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot has a valid changedAt timestamp",
      snapshot.changedAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot includes the parent cancellation request summary",
      snapshot.cancellationRequest !== null,
    );
  }
}
