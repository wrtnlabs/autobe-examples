import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
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

export async function test_api_seller_profile_list_latest_profile_state(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string &
        tags.MinLength<1> &
        tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorized);
  const output = await api.functional.shoppingMall.seller.sellerProfiles.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(output);
  TestValidator.predicate(
    "pagination current is first page",
    output.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    output.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  if (output.data.length > 0) {
    const currentSellerProfile = output.data.find(
      (item) => item.seller.id === authorized.id,
    );
    TestValidator.predicate(
      "returned seller profile summary exists for authorized seller",
      currentSellerProfile !== undefined,
    );
    if (currentSellerProfile !== undefined) {
      TestValidator.equals(
        "seller id matches",
        currentSellerProfile.seller.id,
        authorized.id,
      );
      TestValidator.equals(
        "seller email matches",
        currentSellerProfile.seller.email,
        authorized.email,
      );
      TestValidator.predicate(
        "shop name is present",
        currentSellerProfile.shopName.length > 0,
      );
      TestValidator.predicate(
        "shop description is present",
        currentSellerProfile.shopDescription.length > 0,
      );
      TestValidator.predicate(
        "logo image url is present",
        currentSellerProfile.logoImageUrl.length > 0,
      );
      TestValidator.equals(
        "deleted timestamp is null for active profile",
        currentSellerProfile.deleted_at,
        null,
      );
      TestValidator.equals(
        "summary seller id is linked correctly",
        currentSellerProfile.seller.id,
        authorized.id,
      );
    }
  }
}
