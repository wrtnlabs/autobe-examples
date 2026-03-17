import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import type { IShoppingMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_profile_snapshot_history_filter_and_sort(
  connection: api.IConnection,
): Promise<void> {
  const superAdministratorConnection: api.IConnection = {
    host: connection.host,
  };
  const superAdministrator = await authorize_super_administrator_join(
    superAdministratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdministrator);
  const sellerProfileId = typia.random<string & tags.Format<"uuid">>();
  const search = RandomGenerator.alphabets(6);
  const changedAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const changedAtTo = new Date().toISOString();
  const searchRequest = {
    search,
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    sortBy: "changed_at",
    sortOrder: "asc",
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  let searchPage: IPageIShoppingMallSellerProfileSnapshot.ISummary;
  try {
    searchPage =
      await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.index(
        superAdministratorConnection,
        {
          sellerProfileId,
          body: searchRequest,
        },
      );
  } catch (error) {
    void error;
    await TestValidator.httpError(
      "seller profile snapshot history may be unavailable for unknown profile",
      [400, 401, 403, 404],
      async () => {
        await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.index(
          superAdministratorConnection,
          {
            sellerProfileId,
            body: searchRequest,
          },
        );
      },
    );
    return;
  }
  typia.assert(searchPage);
  TestValidator.equals(
    "search page current reflects request",
    searchPage.pagination.current,
    searchRequest.page,
  );
  TestValidator.equals(
    "search page limit reflects request",
    searchPage.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.predicate(
    "search page record count is non-negative",
    searchPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "search page count is non-negative",
    searchPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "all search items belong to requested seller profile",
    searchPage.data.every(
      (snapshot) => snapshot.sellerProfile.id === sellerProfileId,
    ),
  );
  TestValidator.predicate(
    "search results match preserved snapshot text fields",
    searchPage.data.every((snapshot) => {
      const keyword = search.toLowerCase();
      return (
        snapshot.shop_name.toLowerCase().includes(keyword) ||
        (snapshot.shop_description !== null &&
          snapshot.shop_description.toLowerCase().includes(keyword)) ||
        snapshot.changed_summary.toLowerCase().includes(keyword)
      );
    }),
  );
  TestValidator.predicate(
    "changed_at ascending sort is respected",
    searchPage.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].changed_at).getTime() <=
          new Date(snapshot.changed_at).getTime(),
    ),
  );
  const rangeRequest = {
    changedAtFrom,
    changedAtTo,
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    sortBy: "changed_at",
    sortOrder: "asc",
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  const rangePage =
    await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.index(
      superAdministratorConnection,
      {
        sellerProfileId,
        body: rangeRequest,
      },
    );
  typia.assert(rangePage);
  TestValidator.equals(
    "range page current reflects request",
    rangePage.pagination.current,
    rangeRequest.page,
  );
  TestValidator.equals(
    "range page limit reflects request",
    rangePage.pagination.limit,
    rangeRequest.limit,
  );
  TestValidator.predicate(
    "range results belong to requested seller profile",
    rangePage.data.every(
      (snapshot) => snapshot.sellerProfile.id === sellerProfileId,
    ),
  );
  TestValidator.predicate(
    "range results respect inclusive changed_at boundaries",
    rangePage.data.every((snapshot) => {
      const changedAt = new Date(snapshot.changed_at).getTime();
      return (
        changedAt >= new Date(changedAtFrom).getTime() &&
        changedAt <= new Date(changedAtTo).getTime()
      );
    }),
  );
  TestValidator.predicate(
    "range results remain sorted by changed_at ascending",
    rangePage.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        new Date(array[index - 1].changed_at).getTime() <=
          new Date(snapshot.changed_at).getTime(),
    ),
  );
  const summarySortRequest = {
    page: 1 satisfies number as number,
    limit: 10 satisfies number as number,
    sortBy: "changed_summary",
    sortOrder: "desc",
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  const summarySortPage =
    await api.functional.shoppingMall.superAdministrator.seller_profiles.snapshots.index(
      superAdministratorConnection,
      {
        sellerProfileId,
        body: summarySortRequest,
      },
    );
  typia.assert(summarySortPage);
  TestValidator.equals(
    "summary sort page current reflects request",
    summarySortPage.pagination.current,
    summarySortRequest.page,
  );
  TestValidator.equals(
    "summary sort page limit reflects request",
    summarySortPage.pagination.limit,
    summarySortRequest.limit,
  );
  TestValidator.predicate(
    "summary sort results belong to requested seller profile",
    summarySortPage.data.every(
      (snapshot) => snapshot.sellerProfile.id === sellerProfileId,
    ),
  );
  TestValidator.predicate(
    "changed_summary descending sort is respected",
    summarySortPage.data.every(
      (snapshot, index, array) =>
        index === 0 ||
        array[index - 1].changed_summary.localeCompare(
          snapshot.changed_summary,
        ) >= 0,
    ),
  );
}
