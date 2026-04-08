import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_not_found_for_missing_product(
  connection: api.IConnection,
): Promise<void> {
  const requestConnection: api.IConnection = { host: connection.host };
  const missingProductId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "missing product should return not found",
    404,
    async () => {
      await api.functional.mallPlatform.products.at(requestConnection, {
        productId: missingProductId,
      });
    },
  );
}
