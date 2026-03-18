import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
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

export async function test_api_order_item_snapshots_history_retrieval(
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
  const request = {
    page: 1,
    limit: 10,
    sort: "createdAt",
  } satisfies IShoppingMallOrderItemSnapshot.IRequest;
  const output =
    await api.functional.shoppingMall.administrator.orderItems.snapshots.index(
      adminConnection,
      {
        orderItemId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current page is valid",
    output.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page preserved",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit preserved",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "data length does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  await ArrayUtil.asyncForEach(output.data, async (snapshot) => {
    typia.assert(snapshot);
    typia.assert(snapshot.orderItem);
    typia.assert(snapshot.orderItem.order);
    typia.assert(snapshot.orderItem.productVariant);
    typia.assert(snapshot.orderItem.order.customer);
    TestValidator.predicate(
      "snapshot has preserved product name",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "snapshot has preserved product description",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot has preserved variant SKU",
      snapshot.variantSku.length > 0,
    );
    TestValidator.predicate(
      "snapshot has preserved variant option values",
      snapshot.variantOptionValues.length > 0,
    );
    TestValidator.predicate(
      "snapshot has preserved seller shop name",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "snapshot has preserved seller shop description",
      snapshot.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid quantity",
      snapshot.quantity > 0,
    );
    TestValidator.predicate(
      "snapshot has valid unit price",
      snapshot.unitPrice >= 0,
    );
    TestValidator.predicate(
      "snapshot has valid total price",
      snapshot.totalPrice >= 0,
    );
    TestValidator.predicate(
      "snapshot createdAt is present",
      snapshot.createdAt.length > 0,
    );
  });
  if (output.data.length >= 2) {
    for (let i = 1; i < output.data.length; ++i) {
      TestValidator.predicate(
        "snapshots are ordered chronologically by createdAt",
        output.data[i - 1].createdAt <= output.data[i].createdAt,
      );
    }
  }
  if (output.pagination.pages > 1) {
    const nextPage =
      await api.functional.shoppingMall.administrator.orderItems.snapshots.index(
        adminConnection,
        {
          orderItemId,
          body: {
            ...request,
            page: 2,
          } satisfies IShoppingMallOrderItemSnapshot.IRequest,
        },
      );
    typia.assert(nextPage);
    TestValidator.equals(
      "second page keeps same limit",
      nextPage.pagination.limit,
      request.limit,
    );
    TestValidator.equals(
      "second page number is 2",
      nextPage.pagination.current,
      2,
    );
    TestValidator.predicate(
      "second page ordering remains chronological",
      nextPage.data.length < 2 ||
        nextPage.data.every(
          (snapshot, index, array) =>
            index === 0 || array[index - 1].createdAt <= snapshot.createdAt,
        ),
    );
  }
}
