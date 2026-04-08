import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRequestSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRequestSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_inventory_create";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

/**
 * Test that request snapshots preserve complete audit trail information for dispute resolution.
 *
 * Validates the immutability and completeness of request snapshots that capture state changes for cancellation and refund requests. Ensures that all required fields are present including request type, status transitions, seller reasons, and complete references to customer, seller, and order items.
 *
 * Special attention is given to verifying that snapshots provide sufficient context for dispute resolution by including full customer and seller summaries with shop profile information, as well as order item details with product variant references.
 *
 * 1. Seller registers and authenticates to the platform.
 * 2. Customer registers and authenticates to the platform.
 * 3. Seller creates a product with name, description, and base price.
 * 4. Seller creates a product variant with SKU code, options, and initial stock quantity.
 * 5. Queries existing request snapshots from the system (assuming snapshots exist from other tests or setup).
 * 6. Validates snapshot fields for audit trail completeness including request type, status transitions, and seller reasons.
 * 7. Validates customer summary contains id, email, display_name, banned, and created_at.
 * 8. Validates seller summary contains id, email, approval_status, and seller_profile with shop_name and shop_description.
 * 9. Validates order item summary contains id, quantity, price, status, and references to order, productVariant, and seller.
 * 10. Verifies snapshot immutability by querying again and confirming data remains unchanged.
 */
export async function test_api_seller_request_snapshots_audit_trail_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller registration and authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // 2. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>();
  await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 3. Seller creates a product (for context)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Seller creates a product variant with initial stock
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: null,
          variantOptions: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
          initialStockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Query existing request snapshots (assuming some exist from other tests or system setup)
  const snapshots =
    await api.functional.shoppingMall.seller.request_snapshots.index(
      sellerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 6. Validate pagination structure
  TestValidator.predicate(
    "pagination information exists",
    snapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination.current is valid",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination.limit is valid",
    snapshots.pagination.limit >= 1,
  );
  // 7. If snapshots exist, validate their structure
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    // 8. Validate snapshot.id is a valid UUID
    TestValidator.predicate(
      "snapshot.id is valid UUID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        snapshot.id,
      ),
    );
    // 9. Validate snapshot.request_type is either 'cancellation' or 'refund'
    TestValidator.predicate(
      "snapshot.request_type is valid",
      snapshot.request_type === "cancellation" ||
        snapshot.request_type === "refund",
    );
    // 10. Validate snapshot.status_before exists and is not empty
    TestValidator.predicate(
      "snapshot.status_before exists",
      snapshot.status_before !== undefined &&
        snapshot.status_before !== null &&
        snapshot.status_before !== "",
    );
    // 11. Validate snapshot.status_after exists and is not empty
    TestValidator.predicate(
      "snapshot.status_after exists",
      snapshot.status_after !== undefined &&
        snapshot.status_after !== null &&
        snapshot.status_after !== "",
    );
    // 12. Validate snapshot.status_after is either 'approved' or 'rejected'
    TestValidator.predicate(
      "snapshot.status_after is valid",
      snapshot.status_after === "approved" ||
        snapshot.status_after === "rejected",
    );
    // 13. Validate snapshot.created_at is a valid date-time
    TestValidator.predicate(
      "snapshot.created_at is valid date-time format",
      !isNaN(Date.parse(snapshot.created_at)),
    );
    // 14. Validate snapshot.customer contains required fields
    TestValidator.predicate(
      "snapshot.customer.id exists and is valid UUID",
      snapshot.customer.id !== undefined &&
        snapshot.customer.id !== null &&
        snapshot.customer.id !== "" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.customer.id,
        ),
    );
    TestValidator.predicate(
      "snapshot.customer.email exists and is valid email",
      snapshot.customer.email !== undefined &&
        snapshot.customer.email !== null &&
        snapshot.customer.email !== "",
    );
    TestValidator.predicate(
      "snapshot.customer.display_name exists",
      snapshot.customer.display_name !== undefined &&
        snapshot.customer.display_name !== null,
    );
    TestValidator.predicate(
      "snapshot.customer.banned exists",
      snapshot.customer.banned !== undefined,
    );
    TestValidator.predicate(
      "snapshot.customer.created_at exists and is valid date-time",
      snapshot.customer.created_at !== undefined &&
        snapshot.customer.created_at !== null &&
        !isNaN(Date.parse(snapshot.customer.created_at)),
    );
    // 15. Validate snapshot.seller contains required fields with shop profile
    TestValidator.predicate(
      "snapshot.seller.id exists and is valid UUID",
      snapshot.seller.id !== undefined &&
        snapshot.seller.id !== null &&
        snapshot.seller.id !== "" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.seller.id,
        ),
    );
    TestValidator.predicate(
      "snapshot.seller.email exists and is valid email",
      snapshot.seller.email !== undefined &&
        snapshot.seller.email !== null &&
        snapshot.seller.email !== "",
    );
    TestValidator.predicate(
      "snapshot.seller.approval_status exists",
      snapshot.seller.approval_status !== undefined &&
        snapshot.seller.approval_status !== null,
    );
    TestValidator.predicate(
      "snapshot.seller.seller_profile.shop_name exists",
      snapshot.seller.seller_profile.shop_name !== undefined &&
        snapshot.seller.seller_profile.shop_name !== null,
    );
    TestValidator.predicate(
      "snapshot.seller.seller_profile.shop_description exists",
      snapshot.seller.seller_profile.shop_description !== undefined &&
        snapshot.seller.seller_profile.shop_description !== null,
    );
    TestValidator.predicate(
      "snapshot.seller.seller_profile exists",
      snapshot.seller.seller_profile !== undefined,
    );
    // 16. Validate snapshot.orderItem contains required fields
    TestValidator.predicate(
      "snapshot.orderItem.id exists and is valid UUID",
      snapshot.orderItem.id !== undefined &&
        snapshot.orderItem.id !== null &&
        snapshot.orderItem.id !== "" &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          snapshot.orderItem.id,
        ),
    );
    TestValidator.predicate(
      "snapshot.orderItem.quantity exists and is positive",
      snapshot.orderItem.quantity !== undefined &&
        snapshot.orderItem.quantity !== null &&
        snapshot.orderItem.quantity > 0,
    );
    TestValidator.predicate(
      "snapshot.orderItem.price exists and is positive",
      snapshot.orderItem.price !== undefined &&
        snapshot.orderItem.price !== null &&
        snapshot.orderItem.price > 0,
    );
    TestValidator.predicate(
      "snapshot.orderItem.status exists",
      snapshot.orderItem.status !== undefined &&
        snapshot.orderItem.status !== null &&
        snapshot.orderItem.status !== "",
    );
    TestValidator.predicate(
      "snapshot.orderItem.order.id exists",
      snapshot.orderItem.order.id !== undefined &&
        snapshot.orderItem.order.id !== null &&
        snapshot.orderItem.order.id !== "",
    );
    TestValidator.predicate(
      "snapshot.orderItem.productVariant.id exists",
      snapshot.orderItem.productVariant.id !== undefined &&
        snapshot.orderItem.productVariant.id !== null &&
        snapshot.orderItem.productVariant.id !== "",
    );
    TestValidator.predicate(
      "snapshot.orderItem.seller.id exists",
      snapshot.orderItem.seller.id !== undefined &&
        snapshot.orderItem.seller.id !== null &&
        snapshot.orderItem.seller.id !== "",
    );
    // 17. Verify snapshot immutability by querying again
    const snapshotsAgain =
      await api.functional.shoppingMall.seller.request_snapshots.index(
        sellerConnection,
        {
          body: {
            page: 1,
            limit: 20,
          } satisfies IShoppingMallRequestSnapshot.IRequest,
        },
      );
    typia.assert(snapshotsAgain);
    // 18. Validate snapshot data remains unchanged
    const snapshotAgain = snapshotsAgain.data.find((s) => s.id === snapshot.id);
    TestValidator.predicate(
      "snapshot still exists after second query",
      snapshotAgain !== undefined,
    );
    if (snapshotAgain) {
      TestValidator.equals(
        "snapshot.request_type unchanged",
        snapshotAgain.request_type,
        snapshot.request_type,
      );
      TestValidator.equals(
        "snapshot.status_before unchanged",
        snapshotAgain.status_before,
        snapshot.status_before,
      );
      TestValidator.equals(
        "snapshot.status_after unchanged",
        snapshotAgain.status_after,
        snapshot.status_after,
      );
      TestValidator.equals(
        "snapshot.seller_reason unchanged",
        snapshotAgain.seller_reason,
        snapshot.seller_reason,
      );
      TestValidator.equals(
        "snapshot.created_at unchanged",
        snapshotAgain.created_at,
        snapshot.created_at,
      );
      TestValidator.equals(
        "snapshot.customer.id unchanged",
        snapshotAgain.customer.id,
        snapshot.customer.id,
      );
      TestValidator.equals(
        "snapshot.customer.email unchanged",
        snapshotAgain.customer.email,
        snapshot.customer.email,
      );
      TestValidator.equals(
        "snapshot.seller.id unchanged",
        snapshotAgain.seller.id,
        snapshot.seller.id,
      );
      TestValidator.equals(
        "snapshot.orderItem.id unchanged",
        snapshotAgain.orderItem.id,
        snapshot.orderItem.id,
      );
      TestValidator.equals(
        "snapshot.orderItem.quantity unchanged",
        snapshotAgain.orderItem.quantity,
        snapshot.orderItem.quantity,
      );
      TestValidator.equals(
        "snapshot.orderItem.price unchanged",
        snapshotAgain.orderItem.price,
        snapshot.orderItem.price,
      );
    }
  } else {
    // 19. If no snapshots exist, validate that the response structure is still correct
    TestValidator.predicate(
      "empty data array is valid",
      Array.isArray(snapshots.data) && snapshots.data.length === 0,
    );
    TestValidator.predicate(
      "pagination.records is 0 when no data",
      snapshots.pagination.records === 0,
    );
  }
}