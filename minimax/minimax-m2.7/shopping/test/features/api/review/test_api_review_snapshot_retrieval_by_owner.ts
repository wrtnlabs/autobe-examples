import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_checkout } from "../../../prepare/prepare_random_ecommerce_mall_checkout";
import { generate_random_ecommerce_mall_customer_orders_items_review_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_items_review_create";
import { generate_random_ecommerce_mall_customer_payments_checkout } from "../../../generate/generate_random_ecommerce_mall_customer_payments_checkout";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

type ReviewRating = number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>;

export async function test_api_review_snapshot_retrieval_by_owner(connection: api.IConnection): Promise<void> {
    // 1. Create and authenticate as customer
    const customerConnection: api.IConnection = { host: connection.host };
    const customer = await authorize_customer_join(customerConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(customer);
    customerConnection.headers = {
        Authorization: `Bearer ${customer.token.access}`,
    };

    // 2. Create order with items via checkout
    const order: IEcommerceMallOrder = await generate_random_ecommerce_mall_customer_payments_checkout(customerConnection, {});
    typia.assert(order);

    // 3. Get a delivered order item from the created order
    const orderItem = order.orderItems[0];
    typia.assert(orderItem);

    // 4. Create initial review for the order item
    const initialReview = await generate_random_ecommerce_mall_customer_orders_items_review_create(customerConnection, {
        params: {
            orderId: order.id,
            itemId: orderItem.id,
        },
        body: {
            rating: typia.random<ReviewRating>(),
            content: RandomGenerator.paragraph({ sentences: 2 }),
        },
    });
    typia.assert(initialReview);

    // Store the original values for comparison
    const originalRating = initialReview.rating;
    const originalContent = initialReview.content;

    // 5. Update the review to create a snapshot
    const newRating: ReviewRating = originalRating === 5
        ? (4 as ReviewRating)
        : ((originalRating + 1) as ReviewRating);
    const newContent = RandomGenerator.paragraph({ sentences: 3 });

    const updatedReview = await api.functional.ecommerceMall.customer.reviews.update(customerConnection, {
        reviewId: initialReview.id,
        body: {
            rating: newRating,
            content: newContent,
        },
    });
    typia.assert(updatedReview);

    // Verify the review was updated
    TestValidator.equals("updated rating matches new value", updatedReview.rating, newRating);
    TestValidator.equals("updated content matches new value", updatedReview.content, newContent);

    // 6. Retrieve the review snapshot using the first snapshot ID
    const snapshotSummary = updatedReview.reviewSnapshots[0] as unknown as { id: string; [key: string]: unknown };
    const snapshotId = snapshotSummary.id;
    const snapshot = await api.functional.ecommerceMall.customer.reviews.snapshots.at(customerConnection, {
        reviewId: initialReview.id,
        snapshotId: snapshotId,
    });
    typia.assert(snapshot);

    // 7. Validate snapshot data - should contain the PREVIOUS state before edit
    TestValidator.equals("snapshot contains previous rating", snapshot.rating, originalRating);
    TestValidator.equals("snapshot contains previous content", snapshot.body, originalContent);
    
    const reviewSummary = snapshot.review as unknown as { id: string; newRating: ReviewRating; newContent: string; [key: string]: unknown };
    TestValidator.equals("snapshot review ID matches parent review", reviewSummary.id, initialReview.id);
    TestValidator.equals("snapshot review has current rating state", reviewSummary.newRating, newRating);
    TestValidator.equals("snapshot review has current content state", reviewSummary.newContent, newContent);
    TestValidator.predicate("snapshot has valid timestamp", () => snapshot.createdAt !== null && snapshot.createdAt !== undefined);
}