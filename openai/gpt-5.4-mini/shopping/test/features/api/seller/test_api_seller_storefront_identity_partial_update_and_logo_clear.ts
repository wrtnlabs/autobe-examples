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

export async function test_api_seller_storefront_identity_partial_update_and_logo_clear(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234",
    } satisfies IMallPlatformSeller.IJoin,
  });
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${seller.token.access}`,
  };
  const before = seller.sellerProfile;
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody = {
    shopDescription: updatedDescription,
    logoImageUri: null,
  } satisfies IMallPlatformSellerProfile.IUpdate;
  const updated =
    await api.functional.mallPlatform.seller.storefront_identity.update(
      sellerConnection,
      {
        body: updateBody,
      },
    );
  typia.assert(updated);
  TestValidator.equals("seller profile id preserved", updated.id, before.id);
  TestValidator.equals(
    "seller account id preserved",
    updated.sellerAccount.id,
    before.sellerAccount.id,
  );
  TestValidator.equals(
    "seller account email preserved",
    updated.sellerAccount.email,
    before.sellerAccount.email,
  );
  TestValidator.equals(
    "seller account status preserved",
    updated.sellerAccount.status,
    seller.sellerProfile.sellerAccount.status,
  );
  TestValidator.equals(
    "seller rejection reason preserved",
    updated.sellerAccount.rejectionReason,
    seller.rejectionReason,
  );
  TestValidator.equals(
    "shop name unchanged when omitted",
    updated.shopName,
    before.shopName,
  );
  TestValidator.equals(
    "shop description updated",
    updated.shopDescription,
    updatedDescription,
  );
  TestValidator.equals("logo image cleared", updated.logoImageUri, null);
  TestValidator.equals(
    "seller profile owner preserved",
    updated.sellerAccount.deletedAt,
    seller.deletedAt,
  );
}
