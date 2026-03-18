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

export async function test_api_seller_profile_list_excludes_deleted_profiles(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" satisfies string & tags.Format<"password">,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  sellerConnection.headers = {
    ...(sellerConnection.headers ?? {}),
    Authorization: seller.token.access,
  };
  const page = await api.functional.shoppingMall.seller.sellerProfiles.index(
    sellerConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "seller profile list should contain only active profiles",
    page.data.every((profile) => profile.deleted_at === null),
  );
  TestValidator.predicate(
    "seller profile list should contain active sellers only",
    page.data.every((profile) => profile.seller.deletedAt === null),
  );
  TestValidator.predicate(
    "pagination current page should be valid",
    page.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit should be valid",
    page.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    page.pagination.pages >= 0,
  );
}
