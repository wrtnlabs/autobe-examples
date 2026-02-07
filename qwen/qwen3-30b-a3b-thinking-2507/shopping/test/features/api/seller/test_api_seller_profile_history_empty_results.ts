import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_history_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random seller ID for testing
  const sellerId = RandomGenerator.alphaNumeric(10);
  // Call the API endpoint with the seller ID and empty request (since IRequest is {})
  const response =
    await api.functional.ecommerce.sellers.seller_profile_snapshots.index(
      connection,
      {
        sellerId,
        body: typia.random<IEcommerceSellerProfileSnapshot.IRequest>(),
      },
    );
  typia.assert(response);
  // Test that the data array is empty
  TestValidator.equals("data array should be empty", response.data.length, 0);
  // Test that the pagination metadata is correct
  TestValidator.equals(
    "pagination records should be 0",
    response.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be 0",
    response.pagination.pages,
    0,
  );
}
