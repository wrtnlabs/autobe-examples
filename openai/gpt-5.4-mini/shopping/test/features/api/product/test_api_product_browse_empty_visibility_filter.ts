import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

/**
 * Verifies empty product browsing results when visibility filters exclude all matches.
 *
 * This test authenticates a seller with an isolated connection and queries the seller product browse
 * endpoint using a deliberately restrictive filter set that should match no visible products. It
 * validates the empty-state behavior of the paginated response and confirms that pagination metadata
 * remains consistent when no records are returned.
 *
 * 1. Register and authenticate a seller account using a dedicated connection.
 * 2. Request product browsing with filters that produce no visible matches.
 * 3. Verify the response is an empty, well-formed page with valid pagination metadata.
 */
export async function test_api_product_browse_empty_visibility_filter(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com`,
      password: RandomGenerator.alphabets(12),
    } satisfies IMallPlatformSeller.IJoin,
  });
  const output = await api.functional.mallPlatform.seller.products.index(
    sellerConnection,
    {
      body: {
        search: RandomGenerator.alphabets(32),
        minPrice: 999999,
        maxPrice: 1000000,
        inStockOnly: true,
        sort: "newest",
        page: 1,
        limit: 10,
      } satisfies IMallPlatformProduct.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("empty result set", output.data.length, 0);
  TestValidator.equals("zero matching records", output.pagination.records, 0);
  TestValidator.equals("zero total pages", output.pagination.pages, 0);
  TestValidator.equals("current page preserved", output.pagination.current, 1);
  TestValidator.equals(
    "requested limit preserved",
    output.pagination.limit,
    10,
  );
}
