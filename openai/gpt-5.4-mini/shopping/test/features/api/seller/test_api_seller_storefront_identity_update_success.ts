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

export async function test_api_seller_storefront_identity_update_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail = `${RandomGenerator.alphabets(8)}@test.com`;
  const sellerPassword = "1234";
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const beforeProfile = authorized.sellerProfile;
  const updateBody = {
    shopName: `${beforeProfile.shopName} Updated`,
    shopDescription: RandomGenerator.paragraph({ sentences: 3 }),
    logoImageUri: `https://example.com/logo-${RandomGenerator.alphabets(8)}.png`,
  } satisfies IMallPlatformSellerProfile.IUpdate;
  const updatedProfile =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "seller account id should remain unchanged",
    updatedProfile.sellerAccount.id,
    beforeProfile.sellerAccount.id,
  );
  TestValidator.equals(
    "seller email should remain unchanged",
    updatedProfile.sellerAccount.email,
    beforeProfile.sellerAccount.email,
  );
  TestValidator.equals(
    "shop name should be updated",
    updatedProfile.shopName,
    updateBody.shopName,
  );
  TestValidator.equals(
    "shop description should be updated",
    updatedProfile.shopDescription,
    updateBody.shopDescription,
  );
  TestValidator.equals(
    "logo image uri should be updated",
    updatedProfile.logoImageUri,
    updateBody.logoImageUri,
  );
  TestValidator.notEquals(
    "storefront identity should change after update",
    beforeProfile.shopName,
    updatedProfile.shopName,
  );
  TestValidator.notEquals(
    "storefront description should change after update",
    beforeProfile.shopDescription,
    updatedProfile.shopDescription,
  );
  TestValidator.notEquals(
    "storefront logo should change after update",
    beforeProfile.logoImageUri,
    updatedProfile.logoImageUri,
  );
}
