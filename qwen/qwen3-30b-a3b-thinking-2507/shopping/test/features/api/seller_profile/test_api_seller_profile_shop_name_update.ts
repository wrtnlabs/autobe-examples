import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_shop_name_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  const newShopName = typia.random<
    string & tags.MinLength<3> & tags.MaxLength<50>
  >();
  const updatedProfile = await api.functional.ecommerce.sellers.profile.update(
    sellerConnection,
    {
      sellerId: seller.id,
      body: {
        shop_name: newShopName,
      },
    },
  );
  typia.assert(updatedProfile);
  TestValidator.equals(
    "Shop name matches input",
    updatedProfile.shop_name,
    newShopName,
  );
  const duplicateSellerConnection: api.IConnection = { host: connection.host };
  const duplicateSeller = await authorize_seller_join(
    duplicateSellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  await TestValidator.error(
    "Should fail to update profile with duplicate shop name (across sellers)",
    async () => {
      await api.functional.ecommerce.sellers.profile.update(
        duplicateSellerConnection,
        {
          sellerId: duplicateSeller.id,
          body: {
            shop_name: newShopName,
          },
        },
      );
    },
  );
}
