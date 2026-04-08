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

/**
 * Verifies nested scope enforcement for cancellation request snapshot browsing.
 *
 * This test authenticates an administrator, then calls the nested snapshot browser
 * using mismatched order item and cancellation request identifiers to ensure the
 * server enforces the parent-child relationship. The request must fail with the
 * platform's standard not-found behavior rather than leaking snapshot data from a
 * different cancellation request.
 *
 * 1. Register and authenticate an administrator in an isolated connection.
 * 2. Call the nested cancellation request snapshot endpoint with random mismatched identifiers.
 * 3. Verify the endpoint rejects the cross-scope access with a not-found HTTP error.
 */
export async function test_api_cancellation_request_snapshot_nested_scope_enforcement(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "cancellation request snapshots should enforce nested order-item scope",
    [404],
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.snapshots.index(
        administratorConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
          body: {
            page: 1,
            limit: 10,
            order: "desc",
          } satisfies IMallPlatformCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
}
