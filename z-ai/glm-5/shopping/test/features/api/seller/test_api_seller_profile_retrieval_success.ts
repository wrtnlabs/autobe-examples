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

export async function test_api_seller_profile_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a seller with complete profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const shopName: string = RandomGenerator.name();
  const shopDescription: string = RandomGenerator.paragraph({ sentences: 3 });
  const logoImage: string = typia.random<
    string & tags.Format<"uri">
  >() satisfies string as string;
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: shopName,
      shop_description: shopDescription,
      logo_image: logoImage,
    },
  });
  typia.assert(seller);
  // 2. Execution: Retrieve seller's public profile using the seller ID
  const publicProfile = await api.functional.shoppingMall.sellers.at(
    connection,
    {
      sellerId: seller.id,
    },
  );
  typia.assert(publicProfile);
  // 3. Validation: Verify public profile fields match
  TestValidator.equals("shopName matches", publicProfile.shopName, shopName);
  TestValidator.equals(
    "shopDescription matches",
    publicProfile.shopDescription,
    shopDescription,
  );
  TestValidator.equals("logoImage matches", publicProfile.logoImage, logoImage);
  // 4. Privacy validation: Ensure sensitive fields are NOT exposed
  TestValidator.predicate("no id field exposed", !("id" in publicProfile));
  TestValidator.predicate(
    "no email field exposed",
    !("email" in publicProfile),
  );
  TestValidator.predicate(
    "no approval_status field exposed",
    !("approval_status" in publicProfile),
  );
  TestValidator.predicate(
    "no rejection_reason field exposed",
    !("rejection_reason" in publicProfile),
  );
  TestValidator.predicate(
    "no suspended field exposed",
    !("suspended" in publicProfile),
  );
  TestValidator.predicate(
    "no banned field exposed",
    !("banned" in publicProfile),
  );
}
