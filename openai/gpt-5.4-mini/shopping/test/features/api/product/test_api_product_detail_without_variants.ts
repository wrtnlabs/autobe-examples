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

export async function test_api_product_detail_without_variants(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.mallPlatform.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "https://example.com/register",
        referrer: "https://example.com/landing",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IMallPlatformSeller.IJoin,
    },
  );
  typia.assert(seller);
  const output = await api.functional.mallPlatform.seller.products.at(
    sellerConnection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "seller account should be present",
    output.sellerAccount !== null && output.sellerAccount !== undefined,
  );
  TestValidator.equals(
    "product has no variants in this scenario",
    output.variants,
    false,
  );
  TestValidator.predicate(
    "product detail response should not expose snapshot collections as live data",
    output.snapshots === false ||
      output.variantSnapshots === false ||
      output.productImageSnapshots === false,
  );
}
