import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_detail_retrieve_full_view(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const product = await api.functional.mallPlatform.seller.products.at(
    sellerConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(product);
  TestValidator.equals(
    "seller account email should match authenticated seller",
    product.sellerAccount.email,
    seller.email,
  );
  TestValidator.predicate("product has a name", product.name.length > 0);
  TestValidator.predicate(
    "product has a description",
    product.description.length > 0,
  );
  TestValidator.predicate("base price is non-negative", product.basePrice >= 0);
  TestValidator.predicate(
    "seller account id is present",
    product.sellerAccount.id.length > 0,
  );
  TestValidator.predicate(
    "category summary is either null or a valid category summary",
    product.category === null ||
      (product.category.name.length > 0 &&
        product.category.description.length >= 0),
  );
}
