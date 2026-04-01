import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_catalog_empty_result_page(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `seller_${RandomGenerator.alphabets(8)}@test.com`,
      password: `P@ssw0rd_${RandomGenerator.alphabets(6)}`,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output = await api.functional.mallPlatform.seller.products.index(
    sellerConnection,
    {
      body: {
        search: RandomGenerator.alphabets(32),
        page: 1,
        limit: 10,
        sort: "newest",
        inStockOnly: true,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("empty result page data length", output.data.length, 0);
  TestValidator.equals(
    "empty result page record count",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result page total pages",
    output.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result page current page",
    output.pagination.current,
    1,
  );
  TestValidator.equals("empty result page limit", output.pagination.limit, 10);
}
