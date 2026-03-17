import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { generate_random_ecommerce_mall_seller_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that administrators can retrieve soft-deleted reviews for oversight and dispute resolution.
 * Creates a complete purchase flow (customer, seller, product, order, delivery),
 * creates a review, soft-deletes it, and verifies that an admin can still retrieve
 * the full review details including the non-null deletedAt timestamp.
 */
export async function test_api_review_retrieval_admin_deleted_review(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin for category creation and review retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!",
      href: "http://localhost:3000/admin/join",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create category as admin for product creation
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 3. Create and register seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!",
      href: "http://localhost:3000/seller/join",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // Submit seller registration and approve it
  const registration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {
        body: {
          taxIdentificationNumber: typia.random<string>(),
          businessRegistrationNumber: typia.random<string>(),
          businessName: RandomGenerator.name(),
          businessAddress: RandomGenerator.name(),
          reason: "Test seller registration for review test",
        } satisfies IEcommerceMallSellerRegistration.ICreate,
      },
    );
  const assertedRegistration = typia.assert<IEcommerceMallSellerRegistration & IEntity>(registration);
  // Approve seller registration as admin
  await api.functional.ecommerceMall.admin.sellers.registrations.review(
    adminConnection,
    {
      registrationId: assertedRegistration.id,
      body: {
        status: "approved",
        rejection_reason: null,
      } satisfies IEcommerceMallSellerRegistration.IReview,
    },
  );
  // 4. Create product with category
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        categoryId: category.id,
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<10000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 5. Create product variant
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8).toUpperCase()}`,
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick([
                "Red",
                "Blue",
                "Green",
                "Black",
              ]),
            },
          ] satisfies IEcommerceMallProductVariantOption.ICreate[],
          price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<10000>
          >(),
          stock: 100,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 6. Add inventory for the variant
  const inventory =
    await generate_random_ecommerce_mall_seller_variants_inventory_create(
      sellerConnection,
      {
        params: { variantId: variant.id },
        body: {
          quantity: 100,
          reason: "Initial stock for testing",
        } satisfies IEcommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory);
  // 7. Create customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "CustomerPass123!",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 8. Add variant to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies IEcommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Create order through checkout
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: RandomGenerator.name(),
        city: "Seoul",
        state: null,
        postalCode: "12345",
        country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID for shipment
  const orderItem = typia.assert<IEcommerceMallOrderItem & IEntity>(order.orderItems[0]!);
  // 10. Create shipment for the order item as seller
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItem.id],
        carrierName: RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS"]),
        trackingNumber: RandomGenerator.alphaNumeric(12).toUpperCase(),
      } satisfies IEcommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 11. Confirm delivery as customer (makes item eligible for review)
  await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
    customerConnection,
    {
      shipmentId: shipment.id,
    },
  );
  // 12. Create review for the delivered order item as customer
  const review = await generate_random_ecommerce_mall_customer_reviews_create(
    customerConnection,
    {
      body: {
        order_item_id: orderItem.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // Verify review has no deletedAt initially (active review)
  TestValidator.predicate(
    "review should be active before deletion",
    review.deletedAt === null,
  );
  // 13. Delete review (soft delete) as customer
  await api.functional.ecommerceMall.customer.reviews.erase(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  // 14. Retrieve deleted review as admin and verify it's accessible
  const retrievedReview = await api.functional.ecommerceMall.reviews.at(
    adminConnection,
    {
      reviewId: review.id,
    },
  );
  typia.assert(retrievedReview);
  // Validate that admin can retrieve soft-deleted review with complete structure
  TestValidator.predicate(
    "admin can access soft-deleted review",
    retrievedReview.id === review.id,
  );
  // Verify deletedAt is now set (soft delete marker)
  TestValidator.predicate(
    "review has deletedAt timestamp after soft deletion",
    retrievedReview.deletedAt !== null,
  );
  // Verify all relationships are populated for audit trail
  TestValidator.predicate(
    "customer relationship is populated",
    typeof retrievedReview.customer === "object" &&
      retrievedReview.customer.id === customer.id,
  );
  TestValidator.predicate(
    "product relationship is populated",
    typeof retrievedReview.product === "object" &&
      retrievedReview.product.id === product.id,
  );
  TestValidator.predicate(
    "order relationship is populated",
    typeof retrievedReview.order === "object" &&
      retrievedReview.order.id === order.id,
  );
  TestValidator.predicate(
    "orderItem relationship is populated",
    typeof retrievedReview.orderItem === "object" &&
      retrievedReview.orderItem.id === orderItem.id,
  );
  // Verify review data integrity is maintained
  TestValidator.equals(
    "review rating matches original",
    retrievedReview.rating,
    review.rating,
  );
  TestValidator.equals(
    "review content matches original",
    retrievedReview.content,
    review.content,
  );
}