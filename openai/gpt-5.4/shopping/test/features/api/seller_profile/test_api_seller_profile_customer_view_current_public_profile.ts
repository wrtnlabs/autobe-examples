import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_customer_view_current_public_profile(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorized);
  const sellerProfile = await api.functional.shoppingMall.seller_profiles.at(
    sellerConnection,
    {
      sellerProfileId: authorized.id,
    },
  );
  typia.assert(sellerProfile);
  TestValidator.equals(
    "profile owner matches joined seller",
    sellerProfile.seller.id,
    authorized.id,
  );
  TestValidator.equals(
    "active public profile is not deleted",
    sellerProfile.deleted_at,
    null,
  );
  TestValidator.predicate(
    "shop name is populated",
    sellerProfile.shop_name.length > 0,
  );
  TestValidator.predicate(
    "shop description is populated",
    sellerProfile.shop_description.length > 0,
  );
  TestValidator.predicate(
    "logo uri is populated",
    sellerProfile.logo_uri.length > 0,
  );
  const repeated = await api.functional.shoppingMall.seller_profiles.at(
    sellerConnection,
    {
      sellerProfileId: authorized.id,
    },
  );
  typia.assert(repeated);
  TestValidator.equals(
    "repeated read is non mutating",
    repeated,
    sellerProfile,
  );
}
