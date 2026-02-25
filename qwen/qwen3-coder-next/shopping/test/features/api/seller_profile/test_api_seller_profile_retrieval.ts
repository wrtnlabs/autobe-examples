import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create seller connection for profile retrieval
  const sellerConnection: api.IConnection = { host: connection.host };
  // Generate seller profile data
  const sellerProfile = api.functional.shoppingMall.sellers.profile.at.random();
  // Test: Retrieve seller profile by seller ID
  const retrieved = await api.functional.shoppingMall.sellers.profile.at(
    sellerConnection,
    {
      sellerId: sellerProfile.id,
    },
  );
  typia.assert(retrieved);
  // Validate profile data
  TestValidator.equals("seller ID matches", retrieved.id, sellerProfile.id);
  TestValidator.equals("email matches", retrieved.email, sellerProfile.email);
  TestValidator.equals(
    "shop name matches",
    retrieved.shop_name,
    sellerProfile.shop_name,
  );
  // Validate optional fields
  if (
    retrieved.shop_description !== undefined &&
    sellerProfile.shop_description !== undefined
  ) {
    TestValidator.equals(
      "shop description matches",
      retrieved.shop_description,
      sellerProfile.shop_description,
    );
  }
  if (
    retrieved.logo_image_url !== undefined &&
    sellerProfile.logo_image_url !== undefined
  ) {
    TestValidator.equals(
      "logo image URL matches",
      retrieved.logo_image_url,
      sellerProfile.logo_image_url,
    );
  }
  // Validate approval status
  TestValidator.predicate(
    "approval status is valid",
    ["pending", "approved", "rejected"].includes(retrieved.approval_status),
  );
  // Validate timestamps
  TestValidator.predicate(
    "created_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrieved.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?(Z|[+-][0-9]{2}:[0-9]{2})$/.test(
      retrieved.updated_at,
    ),
  );
}
