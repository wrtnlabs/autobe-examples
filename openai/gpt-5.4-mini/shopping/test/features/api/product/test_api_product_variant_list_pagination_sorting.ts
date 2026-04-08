import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_variant_list_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  const readConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformProductVariant.IRequest;
  const response = await api.functional.mallPlatform.products.variants.index(
    readConnection,
    {
      productId,
      body: request,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page is first page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination requested limit is preserved",
    response.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    response.data.length <= request.limit!,
  );
  for (const variant of response.data) {
    typia.assert(variant);
    TestValidator.equals(
      "variant belongs to the requested product",
      variant.product.id,
      productId,
    );
    TestValidator.predicate(
      "variant summary contains a SKU code",
      variant.skuCode.length > 0,
    );
    TestValidator.predicate(
      "variant summary contains option values",
      variant.optionValues.length > 0,
    );
  }
}
