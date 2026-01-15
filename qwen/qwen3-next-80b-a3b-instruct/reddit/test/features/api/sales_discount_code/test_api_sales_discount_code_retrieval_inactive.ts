import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleDiscountCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleDiscountCode";
export async function test_api_sales_discount_code_retrieval_inactive(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique, non-existent discount code that does not exist in the system
  const nonExistentCode = typia.random<string & tags.Pattern<"^[A-Z0-9-]+$">>();
  // Verify that retrieving a non-existent discount code returns 404 Not Found
  await TestValidator.error(
    "retrieving non-existent discount code should return 404",
    async () => {
      await api.functional.communityPlatform.salesdiscountcodes.at(connection, {
        discountCode: nonExistentCode,
      });
    },
  );
}
