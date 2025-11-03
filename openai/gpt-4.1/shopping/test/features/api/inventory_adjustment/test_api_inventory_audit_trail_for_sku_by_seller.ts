import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingInventoryAdjustment";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAttributeDimension } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeDimension";
import type { IShoppingAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAttributeValue";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingCategory";
import type { IShoppingInventoryAdjustment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingInventoryAdjustment";
import type { IShoppingProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProduct";
import type { IShoppingProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductAttribute";
import type { IShoppingProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingProductImage";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSku";
import type { IShoppingSkuImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuImage";
import type { IShoppingSkuVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSkuVariant";
import type { IShoppingTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingTag";

export async function test_api_inventory_audit_trail_for_sku_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(10),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);
  TestValidator.equals(
    "registered seller email matches",
    seller.email,
    sellerEmail,
  );

  // 2. Seller creates product
  const productCode = RandomGenerator.alphaNumeric(10);
  const productBody = {
    code: productCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    main_image_uri: "https://example.com/product.png",
    status: "active",
    business_status: "in_review",
  } satisfies IShoppingProduct.ICreate;
  const product = await api.functional.shopping.seller.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);

  // 3. Seller creates SKU under product
  // Find/create a variant_attribute_value_ids (required, cannot be empty)
  const variant_attribute_value_ids: string[] = [
    // Generate a fake UUID-style string, as we cannot create attribute values here
    typia.random<string & tags.Format<"uuid">>(),
  ];
  const skuCode = RandomGenerator.alphaNumeric(12);
  const skuBody = {
    sku_code: skuCode,
    price: 10000,
    is_active: true,
    status: "in_stock",
    variant_attribute_value_ids,
  } satisfies IShoppingSku.ICreate;
  const sku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: product.code,
      body: skuBody,
    },
  );
  typia.assert(sku);

  // 4. Register an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: "super",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert(admin);

  // 5. As admin, make an inventory adjustment for the SKU
  const adjustmentAmount = 20;
  const reasonCode = "manual_restock";
  const adjBody = {
    sku_code: sku.sku_code,
    adjustment_amount: adjustmentAmount as number & tags.Type<"int32">,
    reason_code: reasonCode,
    actor_type: "admin",
    context_note: "Initial admin inventory restock",
  } satisfies IShoppingInventoryAdjustment.ICreate;
  const adjustment =
    await api.functional.shopping.admin.inventory.adjustments.create(
      connection,
      {
        skuCode: sku.sku_code,
        body: adjBody,
      },
    );
  typia.assert(adjustment);
  TestValidator.equals(
    "adjustment applied to correct SKU",
    adjustment.shopping_sku_id,
    sku.id,
  );
  TestValidator.equals(
    "adjustment reason code",
    adjustment.reason_code,
    reasonCode,
  );
  TestValidator.equals(
    "adjustment amount",
    adjustment.adjustment_amount,
    adjustmentAmount,
  );
  TestValidator.equals("actor type is admin", adjustment.actor_type, "admin");

  // 6. As seller, request the audit log (audit trail) for this SKU and filter
  // for admin adjustments
  await api.functional.auth.seller.join(connection, { body: sellerJoinBody }); // switch back to seller
  const auditReqBody = {
    page: 1 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    actor_type: "admin",
    reason_code: reasonCode,
  } satisfies IShoppingInventoryAdjustment.IRequest;
  const page = await api.functional.shopping.seller.inventory.adjustments.index(
    connection,
    {
      skuCode: sku.sku_code,
      body: auditReqBody,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "audit log contains admin adjustment",
    page.data.some((adj) => adj.id === adjustment.id),
  );
  const found = page.data.find((adj) => adj.id === adjustment.id);
  typia.assertGuard(found!);
  TestValidator.equals(
    "after quantity - before = adjustment amount",
    found.quantity_after - found.quantity_before,
    adjustmentAmount,
  );
  TestValidator.equals(
    "context note matches",
    found.context_note,
    "Initial admin inventory restock",
  );
  TestValidator.equals(
    "actor id is admin",
    found.actor_id,
    adjustment.actor_id,
  );
  TestValidator.equals("sku id matches", found.shopping_sku_id, sku.id);
  TestValidator.equals("sku code matches", sku.sku_code, adjBody.sku_code);

  // 7. Negative case: Seller cannot see audit trail for other sellers' SKUs
  // (simulate another product + sku)
  const otherSellerEmail = typia.random<string & tags.Format<"email">>();
  const otherSeller = await api.functional.auth.seller.join(connection, {
    body: {
      email: otherSellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(),
      contact_phone: RandomGenerator.mobile(),
      status: "pending",
    } satisfies IShoppingSeller.IJoin,
  });
  typia.assert(otherSeller);
  const otherProductCode = RandomGenerator.alphaNumeric(10);
  const otherProduct = await api.functional.shopping.seller.products.create(
    connection,
    {
      body: {
        code: otherProductCode,
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        main_image_uri: "https://example.com/otherproduct.png",
        status: "active",
        business_status: "in_review",
      } satisfies IShoppingProduct.ICreate,
    },
  );
  typia.assert(otherProduct);
  const otherSkuCode = RandomGenerator.alphaNumeric(12);
  const otherSku = await api.functional.shopping.seller.products.skus.create(
    connection,
    {
      productCode: otherProduct.code,
      body: {
        sku_code: otherSkuCode,
        price: 20000,
        is_active: true,
        status: "in_stock",
        variant_attribute_value_ids: [
          typia.random<string & tags.Format<"uuid">>(),
        ],
      } satisfies IShoppingSku.ICreate,
    },
  );
  typia.assert(otherSku);
  // Re-authenticate as the first seller
  await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  await TestValidator.error(
    "seller forbidden from accessing audit trail for another seller's SKU",
    async () => {
      await api.functional.shopping.seller.inventory.adjustments.index(
        connection,
        {
          skuCode: otherSku.sku_code,
          body: auditReqBody,
        },
      );
    },
  );
}
