import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
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

export async function test_api_seller_profile_listing_after_profile_edit(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const browseConnection: api.IConnection = { host: connection.host };
  const initialPage = await api.functional.shoppingMall.seller_profiles.index(
    browseConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(initialPage);
  TestValidator.equals(
    "initial pagination current matches request",
    initialPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "initial pagination limit matches request",
    initialPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "initial records cover current page size",
    initialPage.pagination.records >= initialPage.data.length,
  );
  TestValidator.predicate(
    "initial pages non-negative",
    initialPage.pagination.pages >= 0,
  );
  for (const profile of initialPage.data) {
    TestValidator.predicate(
      "profile excludes customer displayName field",
      !("displayName" in profile),
    );
    TestValidator.predicate(
      "profile excludes customer phoneNumber field",
      !("phoneNumber" in profile),
    );
    TestValidator.predicate(
      "profile excludes customer relation field",
      !("customer" in profile),
    );
    TestValidator.predicate(
      "profile excludes camel-case customer timestamps",
      !("createdAt" in profile) &&
        !("updatedAt" in profile) &&
        !("deletedAt" in profile),
    );
    TestValidator.predicate(
      "seller summary excludes token field",
      !("token" in profile.seller),
    );
  }
  if (initialPage.data.length === 0) return;
  const target = initialPage.data[0];
  const filteredPage = await api.functional.shoppingMall.seller_profiles.index(
    browseConnection,
    {
      body: {
        shop_name: target.shop_name,
        search: target.shop_name,
        page: 1,
        limit: 100,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(filteredPage);
  TestValidator.predicate(
    "target storefront is discoverable by current public shop name",
    ArrayUtil.has(filteredPage.data, (profile) => profile.id === target.id),
  );
  const matched = filteredPage.data.find((profile) => profile.id === target.id);
  TestValidator.predicate(
    "matched storefront exists in filtered results",
    matched !== undefined,
  );
  if (matched === undefined) return;
  TestValidator.equals(
    "matched storefront keeps current shop name",
    matched.shop_name,
    target.shop_name,
  );
  TestValidator.equals(
    "matched storefront keeps current shop description",
    matched.shop_description,
    target.shop_description,
  );
  TestValidator.equals(
    "matched storefront keeps current logo uri",
    matched.logo_uri,
    target.logo_uri,
  );
  TestValidator.equals(
    "matched storefront keeps owning seller summary",
    matched.seller.id,
    target.seller.id,
  );
  TestValidator.predicate(
    "matched storefront excludes customer profile fields",
    !("displayName" in matched) &&
      !("phoneNumber" in matched) &&
      !("customer" in matched) &&
      !("createdAt" in matched) &&
      !("updatedAt" in matched) &&
      !("deletedAt" in matched),
  );
  TestValidator.predicate(
    "matched storefront seller summary excludes token field",
    !("token" in matched.seller),
  );
}
