import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

/**
 * Test that the title field in review creation is truly optional.
 * Customer should successfully create a review without providing a title.
 */
export async function test_api_customer_review_optional_title(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - register with specific password
  const customerJoinPassword = RandomGenerator.alphaNumeric(16);
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerJoinPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    },
  });
  typia.assert(customerJoin);
  // 2. Customer login with same password
  const customerLogin: IEcommerceMallCustomer.ILogin = {
    email: customerJoin.email,
    password: customerJoinPassword,
    href: "http://localhost:3000/login",
    referrer: "http://localhost:3000/",
    ip: "127.0.0.1",
  } satisfies IEcommerceMallCustomer.ILogin;
  const customerAuthorized: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_login(customerConnection, {
      body: customerLogin,
    });
  typia.assert(customerAuthorized);
  // 3. Seller setup - register with specific password
  const sellerJoinPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoin = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerJoinPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000/",
      ip: "127.0.0.1",
    },
  });
  typia.assert(sellerJoin);
  // 4. Seller creates product (update connection with token)
  sellerConnection.headers ??= {};
  sellerConnection.headers.Authorization = sellerJoin.token.access;
  const randomProduct: IEcommerceMallProduct =
    await api.functional.ecommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 5,
            wordMax: 10,
          }),
          category_id: typia.random<string & tags.Format<"uuid">>(),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
        } satisfies IEcommerceMallProduct.ICreate,
      },
    );
  typia.assert(randomProduct);
  // 5. Create a mock order for review (must provide order_id)
  const randomOrderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const mockOrder: IEcommerceMallOrder.ISummary = {
    id: randomOrderId,
    order_number: RandomGenerator.alphaNumeric(10),
    total_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    status: "delivered",
    shipping_address: {
      id: typia.random<string & tags.Format<"uuid">>(),
      recipient_name: RandomGenerator.name(2),
      recipient_phone: RandomGenerator.mobile(),
      street: RandomGenerator.paragraph({ sentences: 2 }),
      city: RandomGenerator.name(1),
      state: RandomGenerator.name(1),
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    },
    created_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEcommerceMallOrder.ISummary;
  // 6. Customer creates review WITHOUT title (title is optional, set to null)
  const reviewBody = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  // Update customer connection with token
  customerConnection.headers ??= {};
  customerConnection.headers.Authorization = customerAuthorized.token.access;
  const reviewCreate: IEcommerceMallReview.ICreate = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    title: null, // Testing that title is optional
    body: reviewBody,
    product_id: randomProduct.id,
    order_id: randomOrderId,
  } satisfies IEcommerceMallReview.ICreate;
  const review: IEcommerceMallReview =
    await api.functional.ecommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: reviewCreate,
      },
    );
  typia.assert(review);
  // 7. Validate review was created with null title
  TestValidator.equals("review title is null", review.title, null);
  TestValidator.equals(
    "review rating matches",
    review.rating,
    reviewCreate.rating,
  );
  TestValidator.equals("review body matches", review.body, reviewCreate.body);
  TestValidator.equals(
    "review product_id matches",
    review.product.id,
    randomProduct.id,
  );
  TestValidator.equals(
    "review order_id matches",
    review.order.id,
    randomOrderId,
  );
  TestValidator.predicate(
    "is verified purchase",
    review.is_verified_purchase === true,
  );
}