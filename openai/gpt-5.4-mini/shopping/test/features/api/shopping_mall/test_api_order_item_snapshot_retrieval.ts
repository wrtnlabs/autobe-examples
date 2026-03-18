import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com` as string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12) satisfies string,
    } satisfies IShoppingMallSeller.IJoin,
  });
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    },
  };
  const snapshot =
    await api.functional.shoppingMall.seller.orderItems.snapshots.at(
      authenticatedSellerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  TestValidator.predicate("snapshot has id", snapshot.id.length > 0);
  TestValidator.predicate(
    "snapshot has product name",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot has product description",
    snapshot.productDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant sku",
    snapshot.variantSku.length > 0,
  );
  TestValidator.predicate(
    "snapshot has variant options",
    snapshot.variantOptionValues.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop name",
    snapshot.sellerShopName.length > 0,
  );
  TestValidator.predicate(
    "snapshot has seller shop description",
    snapshot.sellerShopDescription.length > 0,
  );
  TestValidator.predicate(
    "snapshot quantity is positive",
    snapshot.quantity > 0,
  );
  TestValidator.predicate(
    "snapshot unit price is positive",
    snapshot.unitPrice > 0,
  );
  TestValidator.predicate(
    "snapshot total price is positive",
    snapshot.totalPrice > 0,
  );
  TestValidator.predicate(
    "snapshot createdAt exists",
    snapshot.createdAt.length > 0,
  );
}
