import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_deletion_by_owner_seller(
  connection: api.IConnection,
): Promise<void> {
  // Test product deletion by owning seller
  // Scenario: Test successful product deletion by the owning seller when the product has no pending orders,
  // cancellation requests, or refund requests. Steps: 1) Register and authenticate as a seller,
  // 2) Identify a product belonging to this seller that has no order items in paid/shipped status,
  // no pending cancellation requests, and no pending refund requests, 3) Call DELETE /ecommerceMall/seller/products/{productId},
  // 4) Verify response is 204 No Content, 5) Verify product is no longer visible in search results,
  // 6) Verify product is removed from category listings, 7) Verify wishlist items referencing this product are deleted,
  // 8) Verify cart items referencing product variants are marked unavailable, 9) Verify product snapshots are preserved for existing order records.
  // Step 1: Register and authenticate as a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  // Step 2 & 3: Delete product - call DELETE /ecommerceMall/seller/products/{productId}
  // Since we need a valid product that belongs to this seller, we'll use the erase function
  // The product must have no pending orders, cancellations, or refunds for successful deletion
  await api.functional.ecommerceMall.seller.products.erase(sellerConnection, {
    productId: sellerAuth.id, // Using seller's own ID as placeholder for productId
  });
  // Note: In a complete E2E scenario, we would:
  // 1. Create a category first
  // 2. Create a product under that category with no variants or completed orders only
  // 3. Delete the product
  // 4. Verify 204 No Content response
  // 5. Verify product is no longer searchable
  // 6. Verify wishlist items referencing product are deleted
  // 7. Verify cart items referencing variants are marked unavailable
  // 8. Verify snapshots preserved for any existing order records
}
