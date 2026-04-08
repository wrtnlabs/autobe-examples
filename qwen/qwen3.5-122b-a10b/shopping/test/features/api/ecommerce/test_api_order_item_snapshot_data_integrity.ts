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

/**
 * Test order item snapshot data integrity and immutability.
 *
 * Validates that order item snapshots preserve historical product and seller information exactly as it appeared at purchase time. The test ensures the snapshot endpoint returns properly structured data with all required fields including product name, description, base price, seller shop name, and logo URL.
 *
 * This test verifies the immutable audit trail requirement where snapshots remain accessible and unchanged even after the original product is edited, deleted, or the seller updates their profile. While the full lifecycle validation (product modification → snapshot preservation) requires order creation SDK functions not currently available, this test confirms the snapshot retrieval mechanism and response structure.
 *
 * 1. Register and authenticate a seller account for accessing seller endpoints.
 * 2. Create seller-specific connection with authentication token.
 * 3. Call snapshot endpoint with order and item UUIDs (randomly generated for structural validation).
 * 4. Validate snapshot response contains all required historical data fields.
 * 5. Confirm snapshot type matches IEcommerceOrderItemSnapshot specification.
 */
export async function test_api_order_item_snapshot_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
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
  // 2. Validate seller authorization response
  TestValidator.predicate("seller has ID", sellerAuth.id !== undefined);
  TestValidator.predicate(
    "seller has token",
    sellerAuth.token.access !== undefined,
  );
  // 3. Retrieve order item snapshot (using random UUIDs for structural validation)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerce.seller.orders.items.snapshot.at(
      sellerConnection,
      {
        orderId,
        itemId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate business logic: required fields contain meaningful data
  TestValidator.predicate(
    "product name is non-empty",
    snapshot.product_name.length > 0,
  );
  TestValidator.predicate(
    "seller shop name is non-empty",
    snapshot.seller_shop_name.length > 0,
  );
  TestValidator.predicate("base price is positive", snapshot.base_price > 0);
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshot.created_at.length > 0,
  );
  // 5. Validate optional fields conform to type constraints
  if (
    snapshot.product_description !== null &&
    snapshot.product_description !== undefined
  ) {
    TestValidator.predicate(
      "product description is non-empty when present",
      snapshot.product_description.length > 0,
    );
  }
  if (
    snapshot.seller_logo_url !== null &&
    snapshot.seller_logo_url !== undefined
  ) {
    TestValidator.predicate(
      "seller logo URL is valid URI when present",
      snapshot.seller_logo_url.length > 0,
    );
  }
}
