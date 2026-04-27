import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_profile_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create Seller A with full profile data
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      shop_name: "Modern Furniture",
      shop_description: "Contemporary home furnishings",
    },
  });
  typia.assert(sellerA);
  // 2. Create Seller B with minimal profile (no shop description, no logo)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      shop_name: "Vintage Books",
    },
  });
  typia.assert(sellerB);
  // 3. Fetch profiles via the superAdministrator endpoint (publicly accessible)
  const profileA =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.at(
      connection,
      { sellerId: sellerA.id },
    );
  typia.assert(profileA);
  const profileB =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.at(
      connection,
      { sellerId: sellerB.id },
    );
  typia.assert(profileB);
  // 4. Verify Seller A profile fields
  TestValidator.equals(
    "seller A shop name",
    profileA.shopName,
    "Modern Furniture",
  );
  TestValidator.equals(
    "seller A shop description",
    profileA.shopDescription,
    "Contemporary home furnishings",
  );
  // 5. Verify Seller B profile has null for optional fields
  TestValidator.equals(
    "seller B shop name",
    profileB.shopName,
    "Vintage Books",
  );
  TestValidator.equals(
    "seller B shop description is null",
    profileB.shopDescription,
    null,
  );
  TestValidator.equals("seller B logo image is null", profileB.logoImage, null);
  // 6. Verify seller identity matches in profile
  TestValidator.equals(
    "seller A email matches",
    profileA.seller.email,
    sellerA.email,
  );
  TestValidator.equals(
    "seller B email matches",
    profileB.seller.email,
    sellerB.email,
  );
  TestValidator.equals(
    "seller A approval status",
    profileA.seller.approval_status,
    sellerA.approval_status,
  );
  TestValidator.equals(
    "seller B approval status",
    profileB.seller.approval_status,
    sellerB.approval_status,
  );
  // 7. Verify data isolation: different seller IDs and different profile IDs
  TestValidator.notEquals(
    "seller IDs differ",
    profileA.seller.id,
    profileB.seller.id,
  );
  TestValidator.notEquals("profile IDs differ", profileA.id, profileB.id);
}
