import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallReview";
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
import { generate_random_ecommerce_mall_customer_products_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_products_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_product_review_snapshots_seller_access(
  connection: api.IConnection,
) {
  // 1. Create seller account and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = typia.random<string & tags.Format<"email">>() as string;
  const sellerShopName = RandomGenerator.name();
  const sellerJoinInput: IEcommerceMallSeller.IJoin = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    shop_name: sellerShopName,
  };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: sellerJoinInput,
    },
  );
  typia.assert(sellerAuth);
  // 2. Create product for seller
  const category = typia.random<IEcommerceMallCategory.ISummary>();
  const productCreate: IEcommerceMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_available: true,
    category_id: category.id,
  };
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: productCreate,
    },
  );
  typia.assert(product);
  // 3. Create a customer account for writing reviews
  const customerConnection: api.IConnection = { host: connection.host };
  const customerEmail = typia.random<string & tags.Format<"email">>() as string;
  const customerJoinInput: IEcommerceMallCustomer.IJoin = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(16),
    name: RandomGenerator.name(),
  };
  const customerAuth = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: customerJoinInput,
    },
  );
  typia.assert(customerAuth);
  // 4. Write a review for the product
  const reviewCreate: IEcommerceMallReview.ICreate = {
    order_item_id: typia.random<string & tags.Format<"uuid">>(),
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    text_content: RandomGenerator.paragraph({ sentences: 2 }),
  };
  const review =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: reviewCreate,
      },
    );
  typia.assert(review);
  // 5. Write another review to create multiple snapshots
  const reviewCreate2: IEcommerceMallReview.ICreate = {
    order_item_id: typia.random<string & tags.Format<"uuid">>(),
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    text_content: RandomGenerator.paragraph({ sentences: 1 }),
  };
  const review2 =
    await api.functional.ecommerceMall.customer.products.reviews.create(
      customerConnection,
      {
        productId: product.id,
        body: reviewCreate2,
      },
    );
  typia.assert(review2);
  // 6. Update the first review to create a snapshot
  const reviewUpdate: IEcommerceMallReview.IRequest = {
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
    text_content: RandomGenerator.paragraph({ sentences: 3 }),
  };
  await api.functional.ecommerceMall.customer.reviews.index(
    customerConnection,
    {
      body: reviewUpdate,
    },
  );
  // 7. Seller accesses review snapshots for their product
  const snapshotsPage =
    await api.functional.ecommerceMall.products.review_snapshots.index(
      sellerConnection,
      {
        productId: product.id,
      },
    );
  typia.assert(snapshotsPage);
  // 8. Verify pagination structure
  TestValidator.predicate("has pagination", snapshotsPage.pagination !== null);
  TestValidator.predicate("has data array", Array.isArray(snapshotsPage.data));
  TestValidator.equals(
    "data count matches",
    snapshotsPage.data.length,
    snapshotsPage.pagination.records,
  );
  // 9. Verify snapshots are in reverse chronological order
  if (snapshotsPage.data.length >= 2) {
    const firstTimestamp = new Date(snapshotsPage.data[0].created_at).getTime();
    const secondTimestamp = new Date(
      snapshotsPage.data[1].created_at,
    ).getTime();
    TestValidator.predicate(
      "snapshots in reverse chronological order",
      firstTimestamp >= secondTimestamp,
    );
  }
  // 10. Verify snapshot content structure
  for (const snapshot of snapshotsPage.data) {
    TestValidator.predicate(
      "snapshot has rating",
      typeof snapshot.rating === "number",
    );
    TestValidator.predicate(
      "snapshot rating in range",
      snapshot.rating >= 1 && snapshot.rating <= 5,
    );
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has snapshot_type",
      snapshot.snapshot_type !== undefined,
    );
  }
  // 11. Verify access control: seller cannot access review snapshots for products they don't own
  const randomProduct = typia.random<IEcommerceMallProduct.ISummary>();
  await TestValidator.error(
    "access control prevents viewing other sellers' snapshots",
    async () => {
      await api.functional.ecommerceMall.products.review_snapshots.index(
        sellerConnection,
        {
          productId: randomProduct.id,
        },
      );
    },
  );
}