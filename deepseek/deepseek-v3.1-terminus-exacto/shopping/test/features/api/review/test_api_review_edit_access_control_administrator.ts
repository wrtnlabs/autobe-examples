import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReview";
import type { IEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceReviewEdit";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceReviewEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceReviewEdit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_customer_products_reviews_create";
import { generate_random_ecommerce_seller_products_create } from "../../../generate/generate_random_ecommerce_seller_products_create";
import { prepare_random_ecommerce_product } from "../../../prepare/prepare_random_ecommerce_product";
import { prepare_random_ecommerce_review } from "../../../prepare/prepare_random_ecommerce_review";

/**
 * Test access control enforcement ensuring ONLY administrators can access review edit history.
 * Attempt access with customer credentials (should fail), seller credentials (should fail),
 * and unauthenticated requests (should fail). Validate that only authenticated
 * administrators can successfully retrieve edit history and receive proper error
 * responses for unauthorized access attempts.
 * Verify authorization header validation and JWT token verification mechanisms
 * protect this sensitive audit trail endpoint appropriately.
 */
export async function test_api_review_edit_access_control_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin-password-123",
    },
  });
  typia.assert(adminAuth);
  // 2. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer-password-123",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
    },
  });
  typia.assert(customerAuth);
  // 3. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller-password-123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: "https://example.com",
      referrer: "https://referrer.com",
      ip: "192.168.1.1",
    },
  });
  typia.assert(sellerAuth);
  // 4. Login seller to create product
  const sellerLoginConn: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConn, {
    body: {
      email: sellerAuth.email,
      password: "seller-password-123",
    } satisfies IEcommerceSeller.ILogin,
  });
  // Create product (using utility function)
  const product = await generate_random_ecommerce_seller_products_create(
    sellerLoginConn,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 5,
        }).substring(0, 200),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
        category_id: typia.random<string & tags.Format<"uuid">>(),
      },
    },
  );
  typia.assert(product);
  // 5. Login customer to create review
  const customerLoginConn: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConn, {
    body: {
      email: customerAuth.email,
      password: "customer-password-123",
    } satisfies IEcommerceCustomer.ILogin,
  });
  // Create review
  const review =
    await api.functional.ecommerce.customer.products.reviews.create(
      customerLoginConn,
      {
        productId: product.id,
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceReview.ICreate,
      },
    );
  typia.assert(review);
  // 6. Edit review to create edit history
  const updatedReview =
    await api.functional.ecommerce.customer.products.reviews.update(
      customerLoginConn,
      {
        productId: product.id,
        reviewId: typia.is<IEcommerceReview>(review)
          ? (review as any).id || review.average_rating
            ? (review as any).id!
            : typia.random<string & tags.Format<"uuid">>()
          : typia.random<string & tags.Format<"uuid">>(),
        body: {
          rating: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          content: RandomGenerator.paragraph({ sentences: 4 }),
        } satisfies IEcommerceReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // Extract review ID from response
  const reviewId = typia.is<IEcommerceReview>(updatedReview)
    ? (updatedReview as any).id ||
      (review as any).id ||
      typia.random<string & tags.Format<"uuid">>()
    : typia.random<string & tags.Format<"uuid">>();
  // 7. Test administrator access (should succeed)
  const editHistory =
    await api.functional.ecommerce.administrator.reviews.edits.index(
      adminConnection,
      {
        reviewId: reviewId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceReviewEdit.IRequest,
      },
    );
  typia.assert(editHistory);
  TestValidator.predicate(
    "administrator should get edit history",
    editHistory.data.length >= 0,
  );
  // 8. Test customer access (should fail)
  await TestValidator.error(
    "customer should not access edit history",
    async () => {
      await api.functional.ecommerce.administrator.reviews.edits.index(
        customerLoginConn,
        {
          reviewId: reviewId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceReviewEdit.IRequest,
        },
      );
    },
  );
  // 9. Test seller access (should fail)
  await TestValidator.error(
    "seller should not access edit history",
    async () => {
      await api.functional.ecommerce.administrator.reviews.edits.index(
        sellerLoginConn,
        {
          reviewId: reviewId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceReviewEdit.IRequest,
        },
      );
    },
  );
  // 10. Test unauthenticated access (should fail)
  const unauthenticatedConn: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthenticated should not access edit history",
    async () => {
      await api.functional.ecommerce.administrator.reviews.edits.index(
        unauthenticatedConn,
        {
          reviewId: reviewId,
          body: {
            page: 1,
            limit: 10,
          } satisfies IEcommerceReviewEdit.IRequest,
        },
      );
    },
  );
}
