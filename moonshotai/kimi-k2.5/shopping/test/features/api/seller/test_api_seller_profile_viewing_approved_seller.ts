import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test customer viewing approved seller profile.
 *
 * This test validates that a customer can successfully retrieve the public
 * profile of an approved seller. The endpoint is publicly accessible and
 * returns shop branding information including name, description, and logo.
 */
export async function test_api_seller_profile_viewing_approved_seller(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid seller ID (UUID format)
  const sellerId = typia.random<string & typia.tags.Format<"uuid">>();
  // Call the public endpoint to retrieve seller profile
  const sellerProfile = await api.functional.ecommerceMall.sellers.at(
    connection,
    { sellerId },
  );
  // Validate response structure and types
  typia.assert<IEcommerceMallSeller>(sellerProfile);
}
