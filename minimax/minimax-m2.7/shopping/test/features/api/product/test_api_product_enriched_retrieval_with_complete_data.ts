import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckout";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_product_enriched_retrieval_with_complete_data(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer to authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve enriched product data
  // Using a pre-existing product ID from test data
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product =
    await api.functional.ecommerceMall.customer.products.enriched.at(
      customerConnection,
      {
        productId: productId,
      },
    );
  typia.assert(product);
  // 3. Validate product fields
  TestValidator.equals("product id matches", product.id, productId);
  TestValidator.predicate("has name", product.name.length > 0);
  TestValidator.predicate("has description", product.description.length > 0);
  TestValidator.predicate("has valid basePrice", product.basePrice >= 0);
  TestValidator.predicate("has createdAt", product.createdAt.length > 0);
  TestValidator.predicate("has updatedAt", product.updatedAt.length > 0);
  // 4. Validate variants
  TestValidator.predicate("variants is array", Array.isArray(product.variants));
  for (const variant of product.variants) {
    TestValidator.predicate("variant has skuCode", variant.skuCode.length > 0);
    TestValidator.predicate(
      "variant has optionValues",
      Array.isArray(variant.optionValues),
    );
    TestValidator.predicate(
      "variant optionValues not empty",
      variant.optionValues.length > 0,
    );
    for (const optionValue of variant.optionValues) {
      TestValidator.predicate("option has key", optionValue.key.length > 0);
      TestValidator.predicate("option has value", optionValue.value.length > 0);
    }
    TestValidator.predicate(
      "variant has valid price",
      variant.price === null || variant.price === undefined || variant.price >= 0,
    );
    TestValidator.predicate("variant has quantity", variant.quantity >= 0);
  }
  // 5. Validate images
  TestValidator.predicate("images is array", Array.isArray(product.images));
  TestValidator.predicate("images ordered by displayOrder", (): boolean => {
    if (product.images.length === 0) return true;
    for (let i = 1; i < product.images.length; i++) {
      if (product.images[i].displayOrder < product.images[i - 1].displayOrder) {
        return false;
      }
    }
    return true;
  });
  TestValidator.predicate(
    "first image is main thumbnail",
    product.images[0]?.displayOrder === 0,
  );
  // 6. Validate review statistics
  TestValidator.predicate(
    "averageRating in range",
    product.averageRating >= 0 && product.averageRating <= 5,
  );
  TestValidator.predicate(
    "reviewCount is non-negative",
    product.reviewCount >= 0,
  );
  // 7. Validate seller profile
  TestValidator.predicate("seller has name", product.seller.name.length > 0);
  TestValidator.predicate(
    "seller has description",
    product.seller.description !== null,
  );
  // 8. Validate category
  TestValidator.predicate(
    "category has name",
    product.category.name.length > 0,
  );
}