import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCheckout";
import type { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import type { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import type { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import type { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformReview";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerApprovalRequest";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import type { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import type { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import type { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import type { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import type { IEcommercePlatformSnapshotReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotReview";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCategory";
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
import { generate_random_ecommerce_platform_customer_addresses_create } from "../../../generate/generate_random_ecommerce_platform_customer_addresses_create";
import { generate_random_ecommerce_platform_customer_cart_checkout } from "../../../generate/generate_random_ecommerce_platform_customer_cart_checkout";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_shipments_create } from "../../../generate/generate_random_ecommerce_platform_seller_shipments_create";
import { prepare_random_ecommerce_platform_checkout } from "../../../prepare/prepare_random_ecommerce_platform_checkout";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_shipment } from "../../../prepare/prepare_random_ecommerce_platform_shipment";
import { prepare_random_ecommerce_platform_shipping_address } from "../../../prepare/prepare_random_ecommerce_platform_shipping_address";

/**
 * Test admin retrieval of immutable snapshot review records created when customers edit product reviews.
 *
 * Validates the complete review modification lifecycle where customer edits trigger automatic immutable snapshot creation. The test verifies that snapshot records preserve both before-state (previousRating, previousContent) and after-state (newRating, newContent) data accurately.
 *
 * The workflow tests the audit trail integrity of review modifications, ensuring that administrators can retrieve historical review states for dispute resolution and compliance purposes.
 *
 * 1. Admin, seller, and customer join the platform.
 * 2. Admin logs in to perform administrative operations.
 * 3. Admin approves the seller's registration request.
 * 4. Seller logs in and creates a product listing.
 * 5. Customer creates shipping address and checks out with the product.
 * 6. Seller creates and dispatches shipment for the order.
 * 7. Customer confirms delivery to enable review submission.
 * 8. Customer submits initial review with reference to product and order.
 * 9. Customer edits review to 5-star rating with different text content.
 * 10. System automatically creates immutable snapshot capturing the change.
 * 11. Admin retrieves snapshot review record using snapshot ID.
 * 12. Validates previousRating = 3, newRating = 5, previousContent and newContent match.
 * 13. Validates snapshot header contains entity type 'review' with creation timestamp.
 * 14. Validates review reference includes product, seller, and customer information.
 */
export async function test_api_review_snapshot_retrieval_after_edit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as admin - save credentials for login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: { email: adminEmail, password: adminPassword },
  });
  typia.assert(adminJoinResult);
  // 2. Join as seller - save credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: { email: sellerEmail, password: sellerPassword },
  });
  typia.assert(sellerJoinResult);
  // 3. Join as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 4. Admin logs in with saved credentials
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformAdmin.ILogin,
  });
  // 5. Admin approves seller registration
  // The seller join auto-creates an approval request; use the seller's ID from join
  const approvalResult =
    await api.functional.ecommercePlatform.admin.seller_approval_requests.update(
      adminConnection,
      {
        requestId: sellerJoinResult.id,
        body: {
          status: "approved" as const,
          reason: null,
        } satisfies IEcommercePlatformSellerApprovalRequest.IUpdate,
      },
    );
  typia.assert(approvalResult);
  // 6. Seller logs in and creates product
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommercePlatformSeller.ILogin,
  });
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      { body: { category_id } },
    );
  typia.assert(product);
  // 7. Customer creates shipping address and checks out
  const address =
    await generate_random_ecommerce_platform_customer_addresses_create(
      customerConnection,
      {},
    );
  typia.assert(address);
  const checkout =
    await generate_random_ecommerce_platform_customer_cart_checkout(
      customerConnection,
      { body: { shipping_address_id: address.id } },
    );
  typia.assert(checkout);
  // 8. Seller creates shipment for order items
  const shipmentBody = {
    carrierName: "Test Express",
    trackingNumber: `TRACK-${RandomGenerator.alphabets(10)}`,
    orderItemIds: checkout.items.map((item) => item.id),
  } satisfies IEcommercePlatformShipment.ICreate;
  const shipment =
    await generate_random_ecommerce_platform_seller_shipments_create(
      sellerConnection,
      { body: shipmentBody },
    );
  typia.assert(shipment);
  // 9. Customer confirms delivery
  const confirmedShipment =
    await api.functional.ecommercePlatform.customer.shipments.confirm(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {} satisfies IEcommercePlatformShipment.IConfirm,
      },
    );
  typia.assert(confirmedShipment);
  // 10. Customer submits initial review
  const originalText = RandomGenerator.paragraph({ sentences: 3 });
  const initialReview =
    await api.functional.ecommercePlatform.customer.reviews.submit(
      customerConnection,
      {
        body: {
          productId: product.id,
          orderId: checkout.id,
        } satisfies IEcommercePlatformReview.IRequest,
      },
    );
  typia.assert(initialReview);
  // 11. Customer edits review (rating: 5, different text)
  const newText = RandomGenerator.paragraph({ sentences: 4 });
  const updatedReview =
    await api.functional.ecommercePlatform.customer.reviews.update(
      customerConnection,
      {
        reviewId: initialReview.id,
        body: {
          rating: 5 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<5>,
          text_content: newText,
        } satisfies IEcommercePlatformReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 12. Admin retrieves snapshot review record
  const snapshotReviewId = typia.random<string & tags.Format<"uuid">>();
  const snapshotReview =
    await api.functional.ecommercePlatform.admin.snapshot_reviews.at(
      adminConnection,
      {
        snapshotReviewId,
      },
    );
  typia.assert(snapshotReview);
  // 13. Validate snapshot review fields
  TestValidator.equals(
    "previousRating is 3 (original rating)",
    snapshotReview.previousRating,
    3,
  );
  TestValidator.equals(
    "previousContent matches original review text",
    snapshotReview.previousContent,
    originalText,
  );
  TestValidator.equals(
    "newRating is 5 (updated rating)",
    snapshotReview.newRating,
    5,
  );
  TestValidator.equals(
    "newContent matches updated review text",
    snapshotReview.newContent,
    newText,
  );
  // 14. Validate snapshot header reference
  TestValidator.equals(
    "snapshot entity type is review",
    snapshotReview.snapshot.entityType,
    "review",
  );
  TestValidator.predicate(
    "snapshot has creation timestamp",
    snapshotReview.snapshot.createdAt.length > 0,
  );
  // 15. Validate review reference contains product, seller, customer info
  TestValidator.equals(
    "review reference product ID matches",
    snapshotReview.review.product.id,
    product.id,
  );
  TestValidator.predicate(
    "review reference has seller profile",
    snapshotReview.review.product.sellerProfile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "review reference has customer email",
    snapshotReview.review.customer.email.length > 0,
  );
}
