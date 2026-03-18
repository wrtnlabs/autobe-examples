import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_cancellation_request_snapshot_history_forbidden_for_other_seller(
  connection: api.IConnection,
): Promise<void> {
  const unauthorizedSellerConnection: api.IConnection = {
    host: connection.host,
  };
  const unauthorizedSeller = await authorize_seller_join(
    unauthorizedSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(unauthorizedSeller);
  const targetOrderItemId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "forbidden snapshot history access for another seller",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.seller.order_items.cancellation_request.snapshots.index(
        unauthorizedSellerConnection,
        {
          orderItemId: targetOrderItemId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    },
  );
}
