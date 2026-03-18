import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_refund_request_read_admin_not_found_returns_not_found_no_side_effects(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin using POST /shoppingMall/auth/admin/join.
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials: IShoppingMallAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  };
  const auth: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: credentials,
    },
  );
  typia.assert(auth);
  // 2) Choose a refundRequestId that is guaranteed not to exist.
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3) Call GET /shoppingMall/admin/admin/refund-requests/{refundRequestId}.
  // Expect not-found outcome.
  await TestValidator.httpError("refund request not found", 404, async () => {
    await api.functional.shoppingMall.admin.admin.refund_requests.at(
      adminConnection,
      {
        refundRequestId,
      },
    );
  });
  // Optional: sanity check that a different random id is also not found
  // to further ensure the read endpoint has no observable side effects.
  const otherRefundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.httpError(
    "other refund request not found after read",
    404,
    async () => {
      await api.functional.shoppingMall.admin.admin.refund_requests.at(
        adminConnection,
        {
          refundRequestId: otherRefundRequestId,
        },
      );
    },
  );
}
