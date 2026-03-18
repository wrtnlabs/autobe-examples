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

export async function test_api_cancellation_request_snapshot_history_retrieve(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphabets(12),
    } satisfies IShoppingMallSeller.IJoin,
  });
  const orderItemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const page =
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
  typia.assert(page);
  typia.assert(page.pagination);
  TestValidator.predicate(
    "pagination current page is valid",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page.pagination.pages >= 0,
  );
  for (const snapshot of page.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has a parent cancellation request",
      snapshot.cancellationRequest !== null,
    );
    TestValidator.predicate(
      "snapshot reason is preserved",
      snapshot.reason.length >= 0,
    );
    TestValidator.predicate(
      "snapshot status is preserved",
      snapshot.request_status.length >= 0,
    );
    TestValidator.predicate(
      "snapshot created_at is present",
      snapshot.created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot seller response is nullable preserved data",
      snapshot.seller_response === null || snapshot.seller_response.length >= 0,
    );
  }
  for (let i = 1; i < page.data.length; i++) {
    TestValidator.predicate(
      "snapshots are returned in reverse chronological order",
      page.data[i - 1].created_at >= page.data[i].created_at,
    );
  }
}
