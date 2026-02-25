import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_approved_complete(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random seller ID for testing
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve seller profile
  const profile = await api.functional.shoppingMall.sellers.profile.at(
    connection,
    {
      sellerId: sellerId,
    },
  );
  // Validate profile structure and approval status
  typia.assert(profile);
  // Validate required fields
  TestValidator.predicate(
    "seller ID is valid UUID",
    /^[0-9a-f-]{36}$/i.test(profile.id),
  );
  TestValidator.predicate(
    "email is valid format",
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email),
  );
  TestValidator.predicate(
    "shop name is set",
    typeof profile.shop_name === "string" && profile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "created_at exists",
    typeof profile.created_at === "string",
  );
  TestValidator.predicate(
    "updated_at exists",
    typeof profile.updated_at === "string",
  );
  // Validate approval workflow fields
  TestValidator.predicate(
    "approval status is valid",
    ["pending", "approved", "rejected"].includes(profile.approval_status),
  );
  // If approved, validation timestamp should exist
  if (profile.approval_status === "approved") {
    TestValidator.notEquals(
      "approval date exists when approved",
      profile.approval_date,
      null,
    );
  }
  // If rejected, rejection reason should exist
  if (profile.approval_status === "rejected") {
    TestValidator.notEquals(
      "rejection reason exists when rejected",
      profile.rejection_reason,
      null,
    );
  }
}
