import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_retrieval_null_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and register seller with null optional fields
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.shoppingMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
        shop_description: null,
        logo_image_url: null,
      } satisfies IShoppingMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  typia.assertEquals<IShoppingMallSeller.IAuthorized>(sellerAuth);
  // Create new connection with the registered seller's token
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  sellerAuthConnection.headers = {
    Authorization: sellerAuth.token.access,
  };
  // 2. As seller, retrieve own profile to verify null fields are preserved
  const sellerProfile = await api.functional.shoppingMall.sellers.at(
    sellerAuthConnection,
    {
      sellerId: sellerAuth.data.profile.id,
    },
  );
  typia.assert(sellerProfile);
  // 3. Verify null fields are properly handled
  TestValidator.equals(
    "shop_description is null",
    sellerProfile.shop_description,
    null,
  );
  TestValidator.equals(
    "logo_image_url is null",
    sellerProfile.logo_image_url,
    null,
  );
  // 4. As administrator, retrieve seller profile for oversight validation
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.shoppingMall.auth.admin.login(
    adminConnection,
    {
      body: {
        email: "admin@test.com",
        password: "1234",
      } satisfies IShoppingMallAdmin.ILogin,
    },
  );
  typia.assert(adminAuth);
  const adminConnectionWithToken: api.IConnection = { host: connection.host };
  adminConnectionWithToken.headers = {
    Authorization: adminAuth.token.access,
  };
  const adminRetrievedProfile = await api.functional.shoppingMall.sellers.at(
    adminConnectionWithToken,
    {
      sellerId: sellerProfile.id,
    },
  );
  typia.assert(adminRetrievedProfile);
  // 5. Verify administrator can retrieve profile with null fields
  TestValidator.equals(
    "admin sees null shop_description",
    adminRetrievedProfile.shop_description,
    null,
  );
  TestValidator.equals(
    "admin sees null logo_image_url",
    adminRetrievedProfile.logo_image_url,
    null,
  );
  TestValidator.equals(
    "profile IDs match",
    adminRetrievedProfile.id,
    sellerProfile.id,
  );
}
