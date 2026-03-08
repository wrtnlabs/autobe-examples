import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_minimal_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller with minimal fields - only shop_name required, no description/logo
  const seller = await authorize_seller_join(connection, {
    body: {
      shop_description: null,
      logo_image: null,
    },
  });
  typia.assert(seller);
  // 2. Retrieve seller's public profile
  const profile = await api.functional.shoppingMall.sellers.at(connection, {
    sellerId: seller.id,
  });
  typia.assert(profile);
  // 3. Validate that required field is present and matches
  TestValidator.equals(
    "shopName should match",
    profile.shopName,
    seller.shopName,
  );
  // 4. Validate that optional fields are null
  TestValidator.equals(
    "shopDescription should be null",
    profile.shopDescription,
    null,
  );
  TestValidator.equals("logoImage should be null", profile.logoImage, null);
}
