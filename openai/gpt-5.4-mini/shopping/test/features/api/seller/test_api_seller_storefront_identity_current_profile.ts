import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_storefront_identity_current_profile(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const email = `${RandomGenerator.alphaNumeric(8)}@test.com` as string &
    tags.Format<"email">;
  const password = `${RandomGenerator.alphaNumeric(12)}Aa!` as string &
    tags.Format<"password">;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const profile =
    await api.functional.mallPlatform.seller.storefront_identity.at(
      sellerConnection,
    );
  typia.assert(profile);
  TestValidator.equals(
    "storefront seller account id should match authenticated seller",
    profile.sellerAccount.id,
    authorized.id,
  );
  TestValidator.equals(
    "storefront seller account email should match authenticated seller",
    profile.sellerAccount.email,
    authorized.email,
  );
  TestValidator.equals(
    "storefront seller account status should match authenticated seller status",
    profile.sellerAccount.status,
    authorized.status.status,
  );
  TestValidator.equals(
    "storefront seller account rejection reason should match authenticated seller rejection reason",
    profile.sellerAccount.rejectionReason,
    authorized.status.rejectionReason,
  );
  TestValidator.equals(
    "storefront profile id should match authenticated seller profile",
    profile.id,
    authorized.sellerProfile.id,
  );
  TestValidator.equals(
    "storefront shop name should reflect the current seller profile",
    profile.shopName,
    authorized.sellerProfile.shopName,
  );
  TestValidator.equals(
    "storefront shop description should reflect the current seller profile",
    profile.shopDescription,
    authorized.sellerProfile.shopDescription,
  );
  TestValidator.equals(
    "storefront logo image uri should reflect the current seller profile",
    profile.logoImageUri,
    authorized.sellerProfile.logoImageUri,
  );
}
