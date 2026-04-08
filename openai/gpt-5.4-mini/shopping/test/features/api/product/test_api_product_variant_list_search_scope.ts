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

export async function test_api_product_variant_list_search_scope(
  connection: api.IConnection,
): Promise<void> {
  const productId = typia.random<string & tags.Format<"uuid">>();
  const response = await api.functional.mallPlatform.products.variants.index(
    connection,
    {
      productId,
      body: {
        search: RandomGenerator.alphabets(8),
        page: 1,
        limit: 10,
      } satisfies IMallPlatformProductVariant.IRequest,
    },
  );
  typia.assert(response);
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response data is a summary collection",
    Array.isArray(response.data),
  );
  TestValidator.predicate(
    "all returned variants belong to the requested product scope",
    response.data.every((variant) => variant.product.id === productId),
  );
  const emptyResponse =
    await api.functional.mallPlatform.products.variants.index(connection, {
      productId,
      body: {
        search: `nomatch-${RandomGenerator.alphabets(8)}`,
        page: 1,
        limit: 10,
      } satisfies IMallPlatformProductVariant.IRequest,
    });
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty pagination current page",
    emptyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty pagination limit",
    emptyResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "empty pagination records non-negative",
    emptyResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "empty pagination pages non-negative",
    emptyResponse.pagination.pages >= 0,
  );
  TestValidator.equals("empty result data", emptyResponse.data.length, 0);
}
