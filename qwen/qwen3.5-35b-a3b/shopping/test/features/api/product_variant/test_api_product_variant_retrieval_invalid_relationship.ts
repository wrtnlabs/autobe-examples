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

export async function test_api_product_variant_retrieval_invalid_relationship(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Generate fabricated UUIDs that definitely don't exist in database
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const nonExistentVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Test Case 1: Valid variantId but belongs to different product
  // Generate two different UUIDs - one for product URL, one for variant URL
  const differentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const differentVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error(
    "variant belongs to different product returns 404",
    async () => {
      await api.functional.ecommerceMall.products.variants.at(
        customerConnection,
        {
          productId: differentProductId,
          variantId: differentVariantId,
        },
      );
    },
  );
  // 4. Test Case 2: Valid productId but variantId doesn't exist at all
  const existingProductIdStyle: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const randomVariantId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  await TestValidator.error("non-existent variant returns 404", async () => {
    await api.functional.ecommerceMall.products.variants.at(
      customerConnection,
      {
        productId: existingProductIdStyle,
        variantId: randomVariantId,
      },
    );
  });
  // 5. Test Case 3: Product doesn't exist, regardless of variantId
  await TestValidator.error("non-existent product returns 404", async () => {
    await api.functional.ecommerceMall.products.variants.at(
      customerConnection,
      {
        productId: nonExistentProductId,
        variantId: nonExistentVariantId,
      },
    );
  });
}
