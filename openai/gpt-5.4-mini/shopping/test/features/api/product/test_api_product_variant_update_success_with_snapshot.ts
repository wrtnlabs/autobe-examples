import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_update_success_with_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const registered = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(registered);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const priceOverride1 = (Math.floor(Math.random() * 9000) +
    1000) satisfies number as number;
  const firstBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    option_values: RandomGenerator.paragraph({ sentences: 2 }),
    price_override: priceOverride1,
  } satisfies IMallPlatformProductVariant.IUpdate;
  const firstUpdated =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: firstBody,
      },
    );
  typia.assert(firstUpdated);
  TestValidator.equals(
    "parent product id should remain the same",
    firstUpdated.product.id,
    productId,
  );
  TestValidator.equals(
    "sku code should update",
    firstUpdated.skuCode,
    firstBody.sku_code,
  );
  TestValidator.equals(
    "option values should update",
    firstUpdated.optionValues,
    firstBody.option_values,
  );
  TestValidator.equals(
    "price override should update",
    firstUpdated.priceOverride,
    firstBody.price_override,
  );
  const secondBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(10)}`,
    option_values: RandomGenerator.paragraph({ sentences: 3 }),
    price_override: null,
  } satisfies IMallPlatformProductVariant.IUpdate;
  const secondUpdated =
    await api.functional.mallPlatform.seller.products.variants.update(
      sellerConnection,
      {
        productId,
        variantId,
        body: secondBody,
      },
    );
  typia.assert(secondUpdated);
  TestValidator.equals(
    "parent product id should still remain the same",
    secondUpdated.product.id,
    productId,
  );
  TestValidator.equals(
    "sku code should update again",
    secondUpdated.skuCode,
    secondBody.sku_code,
  );
  TestValidator.equals(
    "option values should update again",
    secondUpdated.optionValues,
    secondBody.option_values,
  );
  TestValidator.equals(
    "price override should accept null",
    secondUpdated.priceOverride,
    secondBody.price_override,
  );
}
