import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a seller public profile when the seller has no shop profile created yet.
 *
 * This test verifies the edge case where a seller has registered but has not yet set up
 * their shop identity. The endpoint should return a 200 status with the seller ID and
 * approval_status, but the profile object should contain null or empty values for
 * name, description, and logo_uri.
 *
 * According to the business rule: profile.name maps to shop_name which is optional.
 * The API handles this edge case by returning an empty profile object with null values.
 */
export async function test_api_seller_public_profile_view_without_shop_setup(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random seller UUID to test the public profile endpoint
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Call the public seller profile endpoint
  const output = await api.functional.ecommerceMall.sellers._public.at(
    connection,
    {
      sellerId,
    },
  );
  // Validate the response structure
  typia.assert(output);
  // Validate seller ID is returned (should be a valid UUID)
  TestValidator.equals("seller ID is a valid UUID", output.id, sellerId);
  // Validate approval_status is returned (could be any valid status)
  TestValidator.predicate(
    "approval_status exists",
    output.approval_status !== null && output.approval_status !== undefined,
  );
  // Validate profile object exists
  TestValidator.predicate(
    "profile object exists",
    output.profile !== null && output.profile !== undefined,
  );
  // Validate profile.name is an empty string or the field is handled gracefully
  // The API returns empty profile with null values when no shop profile is created
  TestValidator.equals("profile.name is empty string", output.profile.name, "");
  // Validate profile.description is an empty string
  TestValidator.equals(
    "profile.description is empty string",
    output.profile.description,
    "",
  );
  // Validate profile.logo_uri is null (no logo uploaded yet)
  TestValidator.equals(
    "profile.logo_uri is null",
    output.profile.logo_uri,
    null,
  );
}
