import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
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

export async function test_api_product_variant_retrieval_inactive_variant(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup - register and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IEcommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create a product for the seller using random data (simulated mode)
  // Note: In real E2E, this would require a product creation endpoint
  const product: IEcommerceMallProduct.ISummary =
    typia.random<IEcommerceMallProduct.ISummary>();
  // 3. Create an initial variant for the product (using random data)
  // We generate the variant data first
  const variantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialVariant: IEcommerceMallProductVariant = {
    id: variantId,
    product: product,
    skuCode: RandomGenerator.alphaNumeric(10),
    optionValues: {
      size: "Large",
      color: "Red",
    },
    priceOverride: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    stockQuantity: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } satisfies IEcommerceMallProductVariant;
  // 4. Update the variant to mark it as inactive (simulated)
  const inactiveVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {
          is_active: false,
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(inactiveVariant);
  // 5. Validate the variant is marked inactive after update
  TestValidator.equals("variant is inactive", inactiveVariant.isActive, false);
  // 6. Retrieve the inactive variant (this should succeed for the seller)
  const retrievedVariant: IEcommerceMallProductVariant =
    await api.functional.ecommerceMall.products.variants.at(sellerConnection, {
      productId: product.id,
      variantId: variantId,
    });
  typia.assert(retrievedVariant);
  // 7. Validate retrieved variant has all expected properties
  TestValidator.equals("variant id matches", retrievedVariant.id, variantId);
  TestValidator.equals(
    "variant isActive status",
    retrievedVariant.isActive,
    false,
  );
  TestValidator.equals(
    "sku code preserved",
    retrievedVariant.skuCode,
    initialVariant.skuCode,
  );
  TestValidator.equals(
    "option values preserved",
    retrievedVariant.optionValues,
    initialVariant.optionValues,
  );
  TestValidator.equals(
    "price override preserved",
    retrievedVariant.priceOverride,
    initialVariant.priceOverride,
  );
  TestValidator.equals(
    "stock quantity preserved",
    retrievedVariant.stockQuantity,
    initialVariant.stockQuantity,
  );
  TestValidator.equals(
    "product id matches",
    retrievedVariant.product.id,
    product.id,
  );
  // 8. Validate timestamp preservation
  TestValidator.equals(
    "created at preserved",
    retrievedVariant.createdAt,
    initialVariant.createdAt,
  );
  TestValidator.notEquals(
    "updated at changed",
    initialVariant.updatedAt,
    retrievedVariant.updatedAt,
  );
}
