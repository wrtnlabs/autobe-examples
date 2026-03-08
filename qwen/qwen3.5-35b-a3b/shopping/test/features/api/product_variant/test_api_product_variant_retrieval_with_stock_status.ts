import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
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

export async function test_api_product_variant_retrieval_with_stock_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Generate valid product and variant UUIDs for API call
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve product variant by productId and variantId
  const variantResponse =
    await api.functional.ecommerceMall.products.variants.at(
      customerConnection,
      {
        productId,
        variantId,
      },
    );
  typia.assert(variantResponse);
  // 4. Validate variant core fields
  TestValidator.predicate(
    "SKU code has valid format",
    variantResponse.skuCode.length > 0 && variantResponse.skuCode.length <= 50,
  );
  TestValidator.predicate(
    "option values is object",
    typeof variantResponse.optionValues === "object" &&
      variantResponse.optionValues !== null,
  );
  TestValidator.predicate(
    "priceOverride is number or null",
    variantResponse.priceOverride === null ||
      typeof variantResponse.priceOverride === "number",
  );
  TestValidator.predicate(
    "stockQuantity is non-negative integer",
    Number.isInteger(variantResponse.stockQuantity) &&
      variantResponse.stockQuantity >= 0,
  );
  TestValidator.predicate(
    "isActive is boolean",
    typeof variantResponse.isActive === "boolean",
  );
  // 5. Validate parent product relationship
  TestValidator.predicate(
    "product has valid ID",
    typeof variantResponse.product.id === "string" &&
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        variantResponse.product.id,
      ),
  );
  TestValidator.predicate(
    "product has name",
    typeof variantResponse.product.name === "string",
  );
  TestValidator.predicate(
    "product has base_price",
    typeof variantResponse.product.base_price === "number",
  );
  TestValidator.predicate(
    "product category exists",
    variantResponse.product.category !== undefined,
  );
  TestValidator.predicate(
    "product seller exists",
    variantResponse.product.seller !== undefined,
  );
  // 6. Validate display status calculation
  const expectedInStock =
    variantResponse.stockQuantity > 0 && variantResponse.isActive === true;
  TestValidator.predicate(
    "display status correctly calculated",
    expectedInStock ===
      (variantResponse.stockQuantity > 0 && variantResponse.isActive === true),
  );
  // 7. Verify response includes all required fields
  typia.assert(variantResponse);
}
