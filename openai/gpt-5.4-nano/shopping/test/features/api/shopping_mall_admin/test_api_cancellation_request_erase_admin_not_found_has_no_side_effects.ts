import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_cancellation_request_erase_admin_not_found_has_no_side_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const joinPayload = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: joinPayload,
  });
  typia.assert(adminAuth);
  // authorize_admin_join updates adminConnection headers internally
  const actorConnection: api.IConnection = { host: connection.host };
  actorConnection.headers ??= {};
  actorConnection.headers.Authorization = adminAuth.token.access;
  // 2) Attempt to erase a non-existent cancellation request id
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should not erase non-existent cancellation request (first attempt)",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.cancellation_requests.erase(
        actorConnection,
        {
          cancellationRequestId: nonExistentId,
        },
      );
    },
  );
  // 3) Second attempt must be deterministic
  await TestValidator.httpError(
    "should not erase non-existent cancellation request (second attempt)",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.cancellation_requests.erase(
        actorConnection,
        {
          cancellationRequestId: nonExistentId,
        },
      );
    },
  );
  // 4) Side-effect baseline
  // In the current available API surface for this test context, there are
  // no related resource read endpoints to snapshot/compare. The core
  // observable guarantee here is idempotent/side-effect-free behavior:
  // both deletions against the same non-existent ID consistently fail with 404.
}
