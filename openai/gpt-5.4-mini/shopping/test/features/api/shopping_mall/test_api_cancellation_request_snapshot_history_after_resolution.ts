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

export async function test_api_cancellation_request_snapshot_history_after_resolution(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const output =
    await api.functional.shoppingMall.seller.order_items.cancellation_request.snapshots.index(
      sellerConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "snapshot history data is an array",
    Array.isArray(output.data),
  );
  TestValidator.predicate(
    "snapshot history is ordered newest first",
    output.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].created_at).getTime() >=
          new Date(snapshot.created_at).getTime(),
    ),
  );
  for (const snapshot of output.data) {
    TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has parent cancellation request",
      snapshot.cancellationRequest !== null &&
        snapshot.cancellationRequest !== undefined,
    );
    TestValidator.predicate(
      "snapshot request status exists",
      snapshot.request_status.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason exists",
      snapshot.reason.length > 0,
    );
    TestValidator.predicate(
      "snapshot created timestamp exists",
      snapshot.created_at.length > 0,
    );
  }
}
