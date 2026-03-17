import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieval of seller profile with nullable fields.
 *
 * Validates that the API gracefully handles sellers with incomplete profiles
 * where optional fields like shopDescription and logoImageUrl may be null.
 * This public endpoint requires no authentication.
 */
export async function test_api_seller_profile_viewing_nullable_fields(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random seller ID
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Call the API to retrieve seller profile
  // No authentication required for this public endpoint
  const seller = await api.functional.ecommerceMall.sellers.at(connection, {
    sellerId,
  });
  // Validate response structure including nullable field handling
  // IEcommerceMallSeller allows shopDescription and logoImageUrl to be null
  typia.assert(seller);
}
