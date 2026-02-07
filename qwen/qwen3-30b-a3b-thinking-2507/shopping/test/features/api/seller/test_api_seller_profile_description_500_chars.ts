import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_description_500_chars(
  connection: api.IConnection,
) {
  // Generate description with exactly 500 characters using typia.random with exact constraints
  const description = typia.random<
    string & tags.MinLength<500> & tags.MaxLength<500>
  >();
  // Create seller-specific connection
  const sellerConnection: api.IConnection = { host: connection.host };
  // Update seller profile with the 500-character description
  const profile = await api.functional.ecommerce.sellers.profile.update(
    sellerConnection,
    {
      sellerId: "11111111-1111-1111-1111-111111111111",
      body: {
        shop_description: description,
      } satisfies IEcommerceSellerProfile.IUpdate,
    },
  );
  typia.assert(profile);
  // Validate description length is exactly 500 characters
  TestValidator.equals(
    "description should be exactly 500 characters",
    description.length,
    500,
  );
  TestValidator.equals(
    "profile description should be exactly 500 characters",
    profile.shop_description?.length,
    500,
  );
}
