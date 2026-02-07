import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_seller_profile_shop_name_partial_match(
  connection: api.IConnection,
): Promise<void> {
  // Test data: shop names that should match and shouldn't
  const techShopNames = ["TechGadgets", "TechSupplies", "InnovativeTech"];
  const nonTechShopNames = ["ElectronicsHub"];
  // Get all seller profiles
  const output = await api.functional.ecommerce.seller_profiles.index(
    connection,
    {
      body: typia.random<IEcommerceSellerProfile.IRequest>(),
    },
  );
  typia.assert(output);
  // Verify matching profiles
  const matchingProfiles = output.data.filter((item) =>
    techShopNames.some((name) => item.shop_name.toLowerCase().includes("tech")),
  );
  TestValidator.equals(
    "should find all tech matching shop names",
    matchingProfiles.length,
    techShopNames.length,
  );
  // Verify non-matching profiles
  const nonMatchingProfiles = output.data.filter((item) =>
    nonTechShopNames.some((name) =>
      item.shop_name.toLowerCase().includes("tech"),
    ),
  );
  TestValidator.equals(
    "should not find non-tech matching shop names",
    nonMatchingProfiles.length,
    0,
  );
}
