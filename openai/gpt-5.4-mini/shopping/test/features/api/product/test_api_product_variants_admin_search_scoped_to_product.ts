import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variants_admin_search_scoped_to_product(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com` satisfies string,
      password: RandomGenerator.alphaNumeric(12) as never,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const search = RandomGenerator.alphabets(6);
  const response =
    await api.functional.mallPlatform.administrator.products.variants.index(
      adminConnection,
      {
        productId,
        body: {
          search,
          page: 1,
          limit: 20,
          sort: "+skuCode",
        } satisfies IMallPlatformProductVariant.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "all returned variants belong to the requested product",
    response.data.every((variant) => variant.product.id === productId),
    true,
  );
  TestValidator.equals(
    "all returned variants match the search term in sku code or option values",
    response.data.every(
      (variant) =>
        variant.skuCode.includes(search) ||
        variant.optionValues.includes(search),
    ),
    true,
  );
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    response.pagination.limit,
    20,
  );
  TestValidator.equals(
    "pagination records matches the returned count on the first page of filtered results",
    response.pagination.records,
    response.data.length,
  );
  TestValidator.equals(
    "pagination pages are consistent with the filtered record count",
    response.pagination.pages,
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit),
  );
}
