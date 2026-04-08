import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Generate valid UUIDs for order and order item
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve order item snapshot
  const snapshot =
    await api.functional.ecommerce.seller.orders.items.snapshot.at(
      sellerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate required fields exist and have valid values
  TestValidator.predicate(
    "has valid snapshot id",
    snapshot.id !== null && snapshot.id.length > 0,
  );
  TestValidator.predicate(
    "has valid order item reference",
    snapshot.ecommerce_order_item_id !== null &&
      snapshot.ecommerce_order_item_id.length > 0,
  );
  TestValidator.predicate(
    "product_name is non-empty string",
    snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "seller_shop_name is non-empty string",
    snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate(
    "base_price is non-negative number",
    snapshot.base_price >= 0,
  );
  TestValidator.predicate(
    "created_at is valid datetime string",
    snapshot.created_at.length > 0,
  );
  // 5. Validate optional fields conform to their types when present
  if (
    snapshot.product_description !== null &&
    snapshot.product_description !== undefined
  ) {
    TestValidator.predicate(
      "product_description is string",
      typeof snapshot.product_description === "string",
    );
  }
  if (
    snapshot.seller_logo_url !== null &&
    snapshot.seller_logo_url !== undefined
  ) {
    TestValidator.predicate(
      "seller_logo_url is valid URI",
      snapshot.seller_logo_url.length > 0,
    );
  }
}
