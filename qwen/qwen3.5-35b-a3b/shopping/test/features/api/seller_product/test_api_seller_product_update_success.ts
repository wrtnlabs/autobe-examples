import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Seller authentication via utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "http://localhost:3000/join",
        referrer: "http://localhost:3000",
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // Create seller connection with auth token
  const authenticatedSellerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${seller.token.access}` },
  };
  // Step 2: Create initial product with all fields
  const category: IEcommerceMallCategory.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.name(3),
    is_leaf: true,
    parent: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  } satisfies IEcommerceMallCategory.ISummary;
  // Generate random product data for initial state
  const initialProductData: IEcommerceMallProduct = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: "Initial Product Name",
    description: "Initial product description",
    base_price: 9999,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    seller: {
      id: seller.id,
      email: seller.email,
      approval_status: "approved",
      is_suspended: false,
      is_banned: false,
      created_at: new Date().toISOString(),
    } satisfies IEcommerceMallSeller.ISummary,
    category,
  };
  // Step 3: Update product with modified values
  const updatedProduct =
    await api.functional.ecommerceMall.seller.products.update(
      authenticatedSellerConnection,
      {
        productId: initialProductData.id,
        body: {
          name: "Updated Product Name",
          description: "Updated product description with new details",
          base_price: 12999,
          category_id: category.id,
          is_active: false,
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // Step 4: Validate successful update
  TestValidator.equals(
    "product name updated",
    updatedProduct.name,
    "Updated Product Name",
  );
  TestValidator.equals(
    "product description updated",
    updatedProduct.description,
    "Updated product description with new details",
  );
  TestValidator.equals(
    "product base price updated",
    updatedProduct.base_price,
    12999,
  );
  TestValidator.equals(
    "product category_id maintained",
    updatedProduct.category.id,
    category.id,
  );
  TestValidator.equals(
    "product is_active updated to false",
    updatedProduct.is_active,
    false,
  );
  // Validate updated_at changed from initial
  TestValidator.notEquals(
    "updated_at timestamp changed",
    initialProductData.updated_at,
    updatedProduct.updated_at,
  );
  // Validate seller ownership preserved
  TestValidator.equals(
    "seller identity maintained",
    updatedProduct.seller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller email maintained",
    updatedProduct.seller.email,
    seller.email,
  );
  // Step 5: Test partial update capability
  const partialUpdateResponse =
    await api.functional.ecommerceMall.seller.products.update(
      authenticatedSellerConnection,
      {
        productId: initialProductData.id,
        body: {
          name: "Partially Updated Product",
        } satisfies IEcommerceMallProduct.IUpdate,
      },
    );
  typia.assert(partialUpdateResponse);
  TestValidator.equals(
    "partial update name changed",
    partialUpdateResponse.name,
    "Partially Updated Product",
  );
  // Description should remain unchanged from step 3
  TestValidator.equals(
    "description unchanged after partial update",
    partialUpdateResponse.description,
    "Updated product description with new details",
  );
  TestValidator.equals(
    "base_price unchanged after partial update",
    partialUpdateResponse.base_price,
    12999,
  );
  TestValidator.equals(
    "is_active unchanged after partial update",
    partialUpdateResponse.is_active,
    false,
  );
}
