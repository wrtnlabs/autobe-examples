import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_order_items_cancellation_request_create } from "../../../generate/generate_random_shopping_mall_administrator_order_items_cancellation_request_create";
import { prepare_random_shopping_mall_cancellation_request } from "../../../prepare/prepare_random_shopping_mall_cancellation_request";

export async function test_api_cancellation_request_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequest =
    await generate_random_shopping_mall_administrator_order_items_cancellation_request_create(
      adminConnection,
      {
        params: { orderItemId },
        body: {
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallCancellationRequest.ICreate,
      },
    );
  typia.assert(cancellationRequest);
  const firstPage =
    await api.functional.shoppingMall.administrator.order_items.cancellation_request.snapshots.index(
      adminConnection,
      {
        orderItemId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "snapshot history should return a valid page",
    firstPage.pagination.current >= 1 &&
      firstPage.pagination.limit >= 0 &&
      firstPage.pagination.pages >= 0 &&
      firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot rows should contain immutable snapshot fields",
    () =>
      firstPage.data.every(
        (snapshot) =>
          typeof snapshot.id === "string" &&
          typeof snapshot.request_status === "string" &&
          typeof snapshot.reason === "string" &&
          (snapshot.seller_response === null ||
            typeof snapshot.seller_response === "string") &&
          typeof snapshot.created_at === "string",
      ),
  );
  TestValidator.predicate(
    "snapshot history should be ordered newest first",
    () =>
      firstPage.data.every(
        (snapshot, index, array) =>
          index === 0 || array[index - 1].created_at >= snapshot.created_at,
      ),
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.shoppingMall.administrator.order_items.cancellation_request.snapshots.index(
        adminConnection,
        {
          orderItemId,
          body: {
            page: 2,
            limit: 100,
          } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.predicate(
      "second snapshot page should be structurally valid when present",
      secondPage.pagination.current === 2 &&
        secondPage.pagination.limit >= 0 &&
        secondPage.pagination.pages >= 0 &&
        secondPage.pagination.records >= 0,
    );
    TestValidator.predicate(
      "second snapshot page rows should remain immutable snapshot data",
      () =>
        secondPage.data.every(
          (snapshot) =>
            typeof snapshot.id === "string" &&
            typeof snapshot.request_status === "string" &&
            typeof snapshot.reason === "string" &&
            (snapshot.seller_response === null ||
              typeof snapshot.seller_response === "string") &&
            typeof snapshot.created_at === "string",
        ),
    );
  }
}
