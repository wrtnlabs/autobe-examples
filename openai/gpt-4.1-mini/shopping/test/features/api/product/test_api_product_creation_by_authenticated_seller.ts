import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_creation_by_authenticated_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a new seller (join)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "p@ssword123",
      shopName: "Test Shop",
      shopDescription: "A test seller shop",
      logoUri: null,
    },
  });
  typia.assert(seller);
  // 2. Prepare product creation data
  //    - Use a random valid product_subcategory_id to simulate real subcategory
  //      This requires fetching or generating a valid subcategory id; since no
  //      direct API provided, we generate random UUID for test but this must be
  //      valid in real environment (replaced by downstream validation).
  const body = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    product_subcategory_id: typia.random<string & tags.Format<"uuid">>(),
    base_price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
  } satisfies IShoppingMallProduct.ICreate;
  // 3. Create product by authenticated seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body,
    },
  );
  typia.assert(product);
  // 4. Assert product properties
  //    - id: valid UUID
  //    - name, description, basePrice match input
  //    - seller and productSubcategory are summaries with required fields
  TestValidator.predicate(
    "product id has uuid format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      product.id,
    ),
  );
  TestValidator.equals("product name", product.name, body.name);
  TestValidator.equals(
    "product description",
    product.description,
    body.description,
  );
  TestValidator.equals("product basePrice", product.basePrice, body.base_price);
  typia.assert(product.seller);
  TestValidator.equals("product seller id", product.seller.id, seller.id);
  TestValidator.equals(
    "product seller email",
    product.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "product seller shopName",
    product.seller.shopName,
    seller.shopName,
  );
  TestValidator.equals(
    "product seller approvalStatus",
    product.seller.approvalStatus,
    seller.approvalStatus,
  );
  typia.assert(product.productSubcategory);
  TestValidator.predicate(
    "product subcategory id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      product.productSubcategory.id,
    ),
  );
  // 5. Verify timestamps
  TestValidator.predicate(
    "createdAt is ISO 8601 date-time",
    !isNaN(Date.parse(product.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is ISO 8601 date-time",
    !isNaN(Date.parse(product.updatedAt)),
  );
  // 6. Verify deletedAt is null
  TestValidator.equals("deletedAt is null", product.deletedAt, null);
}
