import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid UUID that does not correspond to any seller account
  const nonExistentSellerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Attempt to retrieve the non-existent seller profile
  await TestValidator.httpError(
    "non-existent seller returns 404",
    404,
    async () => {
      await api.functional.ecommerce.sellers.at(connection, {
        sellerId: nonExistentSellerId,
      });
    },
  );
}
