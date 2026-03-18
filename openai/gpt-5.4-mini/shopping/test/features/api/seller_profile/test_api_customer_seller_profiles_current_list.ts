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

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_seller_profiles_current_list(
  connection: api.IConnection,
): Promise<void> {
  const joined = await authorize_customer_join(
    { host: connection.host },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
        href: "https://example.com",
        referrer: "https://example.com/referrer",
        ip: "127.0.0.1",
      } satisfies IShoppingMallCustomer.IJoin,
    },
  );
  const customerConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: joined.token.access,
    },
  };
  const firstPage =
    await api.functional.shoppingMall.customer.sellerProfiles.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.predicate(
    "seller profile page has valid pagination",
    () =>
      firstPage.pagination.current >= 0 &&
      firstPage.pagination.limit >= 0 &&
      firstPage.pagination.records >= 0 &&
      firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller profile page size is bounded by limit",
    () => firstPage.data.length <= firstPage.pagination.limit,
  );
  for (const profile of firstPage.data) {
    typia.assert(profile);
    TestValidator.predicate(
      "seller summary exists",
      () =>
        profile.seller.id.length > 0 &&
        profile.seller.email.length > 0 &&
        profile.seller.accountStatus.length > 0,
    );
    TestValidator.predicate(
      "current storefront fields exist",
      () =>
        profile.shopName.length > 0 &&
        profile.shopDescription.length >= 0 &&
        profile.logoImageUrl.length > 0,
    );
    TestValidator.equals(
      "listing exposes current storefront summaries only",
      profile.deleted_at,
      null,
    );
    TestValidator.predicate(
      "seller profile summary is linked to seller storefront",
      () =>
        profile.seller.sellerProfile.id === profile.id &&
        profile.seller.sellerProfile.shopName === profile.shopName &&
        profile.seller.sellerProfile.shopDescription ===
          profile.shopDescription &&
        profile.seller.sellerProfile.logoImageUrl === profile.logoImageUrl,
    );
  }
  if (
    firstPage.pagination.records > firstPage.data.length &&
    firstPage.pagination.pages >= 2
  ) {
    const secondPage =
      await api.functional.shoppingMall.customer.sellerProfiles.index(
        customerConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IShoppingMallSellerProfile.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.notEquals(
      "different seller profile pages should not be identical when more records exist",
      firstPage.data.map((item) => item.id),
      secondPage.data.map((item) => item.id),
    );
  }
}
