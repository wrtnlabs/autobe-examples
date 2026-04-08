import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
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

export async function test_api_product_variant_retrieve_own_product_variant(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const output = await api.functional.mallPlatform.seller.products.variants.at(
    sellerConnection,
    {
      productId: seller.id,
      variantId: seller.sellerProfile.id,
    } satisfies api.functional.mallPlatform.seller.products.variants.at.Props,
  );
  typia.assert(output);
  TestValidator.equals(
    "seller-owned product summary",
    output.product.sellerAccount.id,
    seller.id,
  );
  TestValidator.predicate("sku code is present", output.skuCode.length > 0);
  TestValidator.predicate(
    "option values are present",
    output.optionValues.length > 0,
  );
  TestValidator.predicate(
    "variant is active or inactive flag exists",
    typeof output.isActive === "boolean",
  );
  TestValidator.predicate("created at is present", output.createdAt.length > 0);
  TestValidator.predicate("updated at is present", output.updatedAt.length > 0);
}
