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

export async function test_api_product_variant_list_no_variants(
  connection: api.IConnection,
): Promise<void> {
  const productConnection: api.IConnection = { host: connection.host };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const output = await api.functional.mallPlatform.products.variants.index(
    productConnection,
    {
      productId,
      body: {
        page: 1,
        limit: 10,
      } satisfies IMallPlatformProductVariant.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.equals("pagination records", output.pagination.records, 0);
  TestValidator.equals("pagination pages", output.pagination.pages, 0);
  TestValidator.equals("empty variant list", output.data.length, 0);
}
