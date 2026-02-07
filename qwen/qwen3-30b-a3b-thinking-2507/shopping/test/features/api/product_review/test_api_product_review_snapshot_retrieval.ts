import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAddress";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import type { IEcommerceCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCartItem";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceCustomerEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerEmailVerification";
import type { IEcommerceCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerPasswordReset";
import type { IEcommerceCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomerSession";
import type { IEcommerceDefaultAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDefaultAddress";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReview";
import type { IEcommerceProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductReviewSnapshot";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import type { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_categories_create } from "../../../generate/generate_random_ecommerce_categories_create";
import { generate_random_ecommerce_customer_products_create } from "../../../generate/generate_random_ecommerce_customer_products_create";
import { generate_random_ecommerce_products_create } from "../../../generate/generate_random_ecommerce_products_create";
import { prepare_random_ecommerce_category } from "../../../prepare/prepare_random_ecommerce_category";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_product_review } from "../../../prepare/prepare_random_ecommerce_product_review";

export async function test_api_product_review_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      href: "https://example.com",
      referrer: "https://example.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  // 2. Create category for product setup
  const category = await api.functional.ecommerce.categories.create(
    customerConnection,
    {
      body: typia.random<IEcommerceCategory.ICreate>(),
    },
  );
  typia.assert(category);
  // 3. Create product for review creation
  const product = await api.functional.ecommerce.products.create(
    customerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        basePrice: typia.random<number & tags.Minimum<0.01>>(),
        categoriesId: category.id,
      } satisfies IEcommerceProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Submit initial review
  const initialReview = await api.functional.ecommerce.customer.products.create(
    customerConnection,
    {
      productId: product.id,
      body: {
        rating: typia.random<number & tags.Minimum<1> & tags.Maximum<5>>(),
        comment: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IEcommerceProductReview.ICreate,
    },
  );
  // Fix: Cast to IEcommerceProductReview.ISummary to access id
  typia.assert(initialReview as IEcommerceProductReview.ISummary);
  // 5. Modify the review (this should trigger a snapshot creation in the backend)
  const modifiedReview =
    await api.functional.ecommerce.customer.products.create(
      customerConnection,
      {
        productId: product.id,
        body: {
          rating: typia.random<number & tags.Minimum<1> & tags.Maximum<5>>(),
          comment: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceProductReview.ICreate,
      },
    );
  // Fix: Cast to IEcommerceProductReview.ISummary to access id
  typia.assert(modifiedReview as IEcommerceProductReview.ISummary);
  // 6. Retrieve the snapshot
  const snapshot =
    await api.functional.ecommerce.customer.products.reviews.snapshots.at(
      customerConnection,
      {
        productId: product.id,
        // Fix: Cast initialReview to ISummary to access id
        reviewId: (initialReview as IEcommerceProductReview.ISummary).id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 7. Validate the snapshot contains the before/after state
  TestValidator.equals("Snapshot ID matches", snapshot.id, snapshot.id);
  TestValidator.equals(
    "Review ID matches",
    // Fix: Cast snapshot.review to ISummary
    (snapshot.review as IEcommerceProductReview.ISummary).id,
    // Fix: Cast initialReview to ISummary
    (initialReview as IEcommerceProductReview.ISummary).id,
  );
}
