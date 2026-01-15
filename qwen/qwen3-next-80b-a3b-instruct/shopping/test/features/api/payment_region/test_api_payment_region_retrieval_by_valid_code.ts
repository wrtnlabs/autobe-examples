import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentRegion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRegion";
export async function test_api_payment_region_retrieval_by_valid_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid region code in the format matching the schema requirements (e.g., "US-CA")
  const regionCode = `${RandomGenerator.alphabets(2)}-${RandomGenerator.alphabets(2)}`;
  // Call the API to retrieve the payment region configuration using the generated region code
  const paymentRegion: IShoppingMallPaymentRegion =
    await api.functional.shoppingMall.payment_regions.at(connection, {
      regionId: regionCode,
    });
  // Perform complete type validation using typia.assert()
  typia.assert(paymentRegion);
  // Verify that the returned region_code matches exactly the requested regionId
  TestValidator.equals(
    "returned region_code matches requested regionId",
    paymentRegion.region_code,
    regionCode,
  );
  // Verify that primary_gateway is present and is a non-empty string
  TestValidator.predicate(
    "primary_gateway is a non-empty string",
    typeof paymentRegion.primary_gateway === "string" &&
      paymentRegion.primary_gateway.length > 0,
  );
}
