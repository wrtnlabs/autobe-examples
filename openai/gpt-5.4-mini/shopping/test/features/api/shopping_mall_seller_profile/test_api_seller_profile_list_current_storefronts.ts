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

export async function test_api_seller_profile_list_current_storefronts(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!" satisfies string,
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  const page = await api.functional.shoppingMall.seller.sellerProfiles.index(
    sellerConnection,
    {
      body: {
        search: RandomGenerator.alphabets(8),
        page: 1,
        limit: 2,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("page current", page.pagination.current, 1);
  TestValidator.equals("page limit", page.pagination.limit, 2);
  TestValidator.predicate(
    "page records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data length within limit",
    page.data.length <= 2,
  );
  for (const item of page.data) {
    TestValidator.predicate("seller profile id exists", item.id.length > 0);
    TestValidator.predicate("seller summary exists", item.seller.id.length > 0);
    TestValidator.predicate("shop name exists", item.shopName.length > 0);
    TestValidator.predicate(
      "shop description exists",
      item.shopDescription.length > 0,
    );
    TestValidator.predicate(
      "logo image url exists",
      item.logoImageUrl.length > 0,
    );
    TestValidator.equals(
      "active profile deleted_at is null",
      item.deleted_at,
      null,
    );
  }
  const emptyPage =
    await api.functional.shoppingMall.seller.sellerProfiles.index(
      sellerConnection,
      {
        body: {
          search: `no-match-${RandomGenerator.alphabets(8)}`,
          page: 1,
          limit: 2,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 2);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
}
