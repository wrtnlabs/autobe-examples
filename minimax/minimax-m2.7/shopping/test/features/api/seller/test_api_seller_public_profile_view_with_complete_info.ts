import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_public_profile_view_with_complete_info(
  connection: api.IConnection,
): Promise<void> {
  // Test that a customer or guest can retrieve a seller's public shop profile
  // with complete information. Verify the response contains the seller's UUID,
  // approval_status, and complete profile including shop name, business description,
  // and logo URI. Validate that the approval_status reflects the seller's current
  // verification state (pending, approved, or rejected).
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Call the public seller profile endpoint
  const seller = await api.functional.ecommerceMall.sellers._public.at(
    connection,
    {
      sellerId,
    },
  );
  // Validate response structure and types
  typia.assert(seller);
  // Validate required fields exist
  TestValidator.equals("seller id is uuid format", seller.id, sellerId);
  TestValidator.predicate(
    "approval_status is one of: pending, approved, rejected",
    ["pending", "approved", "rejected"].includes(seller.approval_status),
  );
  // Validate profile object structure
  TestValidator.predicate("profile has name", seller.profile.name.length > 0);
  TestValidator.predicate(
    "profile has description",
    typeof seller.profile.description === "string",
  );
  TestValidator.predicate(
    "profile has logo_uri (can be null)",
    seller.profile.logo_uri !== undefined,
  );
}
