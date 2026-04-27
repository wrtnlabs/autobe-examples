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

export async function test_api_seller_profile_view_public(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register a seller with known profile data
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: IECommerceMallSeller.IAuthorized = await authorize_seller_join(
    sellerConnection,
    {
      body: {
        shop_name: "Artisan Coffee Co.",
        shop_description: "Specialty coffee roasters since 2020",
        logo_image: "https://example.com/logo.png",
      },
    },
  );
  typia.assert(seller);
  // Retrieve the seller's public profile (no auth needed)
  const profile: IECommerceMallSellerProfile =
    await api.functional.eCommerceMall.superAdministrator.sellers.profile.at(
      connection,
      {
        sellerId: seller.id,
      },
    );
  typia.assert(profile);
  // Validate profile fields match the registration data
  TestValidator.equals("shop name", profile.shopName, "Artisan Coffee Co.");
  TestValidator.equals(
    "shop description",
    profile.shopDescription,
    "Specialty coffee roasters since 2020",
  );
  TestValidator.equals(
    "logo image",
    profile.logoImage,
    "https://example.com/logo.png",
  );
  // Validate seller summary embedded in profile
  TestValidator.equals("seller id matches", profile.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    profile.seller.email,
    seller.email,
  );
  TestValidator.equals(
    "approval status is pending",
    profile.seller.approval_status,
    "pending",
  );
  // Validate seller profile summary references
  TestValidator.equals(
    "seller profile shop_name",
    profile.seller.profile.shop_name,
    "Artisan Coffee Co.",
  );
  // Validate account is active (not deleted)
  TestValidator.predicate("deletedAt is null", profile.deletedAt === null);
  TestValidator.predicate(
    "seller deletedAt is null",
    profile.seller.deleted_at === null,
  );
}
