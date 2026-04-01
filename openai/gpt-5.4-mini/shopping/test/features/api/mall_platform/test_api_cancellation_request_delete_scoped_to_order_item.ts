import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_cancellation_request_delete_scoped_to_order_item(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that cancellation request deletion is scoped to the parent order item.
   * Because only the administrator auth and delete endpoint are available in the
   * provided API surface, this test validates the scoped resource behavior by
   * attempting to delete a cancellation request under a mismatched parent item
   * identifier and expecting a not-found style failure.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  await TestValidator.httpError(
    "cancellation request deletion is scoped to its order item",
    [404, 409],
    async () => {
      await api.functional.mallPlatform.administrator.orderItems.cancellationRequests.erase(
        adminConnection,
        {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
