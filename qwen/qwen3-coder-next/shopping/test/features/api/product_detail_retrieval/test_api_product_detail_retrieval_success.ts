import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_product_detail_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Create customer-specific connection for authenticated access
  const customerConnection: api.IConnection = { host: connection.host };
  // Create and authenticate a customer first
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // Generate a random product ID to test the product detail endpoint
  const randomProductId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve product details using the random product ID
  const retrievedProduct = await api.functional.ecommerceMall.products.at(
    customerConnection,
    {
      productId: randomProductId,
    },
  );
  typia.assert(retrievedProduct);
  // Validate response structure
  TestValidator.predicate(
    "has valid ID",
    retrievedProduct.id !== null && retrievedProduct.id !== undefined,
  );
  TestValidator.predicate(
    "has seller",
    retrievedProduct.seller !== null && retrievedProduct.seller !== undefined,
  );
  TestValidator.predicate(
    "has category",
    retrievedProduct.category !== null &&
      retrievedProduct.category !== undefined,
  );
  TestValidator.predicate(
    "has name",
    retrievedProduct.name !== null && retrievedProduct.name !== undefined,
  );
  TestValidator.predicate(
    "has description",
    retrievedProduct.description !== null &&
      retrievedProduct.description !== undefined,
  );
  TestValidator.predicate(
    "has base price",
    typeof retrievedProduct.basePrice === "number",
  );
  TestValidator.predicate(
    "has availability status",
    typeof retrievedProduct.isAvailable === "boolean",
  );
  TestValidator.predicate(
    "has images",
    Array.isArray(retrievedProduct.images) &&
      retrievedProduct.images.length > 0,
  );
  TestValidator.predicate(
    "has variants",
    Array.isArray(retrievedProduct.variants) &&
      retrievedProduct.variants.length > 0,
  );
  TestValidator.predicate(
    "has reviews count",
    typeof retrievedProduct.reviewsCount === "number",
  );
  TestValidator.predicate(
    "has valid average rating",
    typeof retrievedProduct.averageRating === "number" &&
      retrievedProduct.averageRating >= 1 &&
      retrievedProduct.averageRating <= 5,
  );
  TestValidator.predicate(
    "has valid creation timestamp",
    typeof retrievedProduct.createdAt === "string",
  );
  TestValidator.predicate(
    "has valid update timestamp",
    typeof retrievedProduct.updatedAt === "string",
  );
}
