import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_history_filtered_owned_only(
  connection: api.IConnection,
): Promise<void> {
  const sellerOneConnection: api.IConnection = { host: connection.host };
  const sellerOneJoin = await authorize_seller_join(sellerOneConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerOneJoin);
  const sellerTwoConnection: api.IConnection = { host: connection.host };
  const sellerTwoJoin = await authorize_seller_join(sellerTwoConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerTwoJoin);
  TestValidator.notEquals(
    "two sellers are distinct accounts",
    sellerOneJoin.id,
    sellerTwoJoin.id,
  );
  const sellerOneKeyword = `owned-${RandomGenerator.alphabets(8)}`;
  const sellerTwoKeyword = `foreign-${RandomGenerator.alphabets(8)}`;
  const sellerOneUpdateOne =
    await api.functional.shoppingMall.seller.profile.update(
      sellerOneConnection,
      {
        body: {
          displayName: `${sellerOneKeyword}-${RandomGenerator.name(1)}`,
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(sellerOneUpdateOne);
  const sellerOneUpdateTwo =
    await api.functional.shoppingMall.seller.profile.update(
      sellerOneConnection,
      {
        body: {
          displayName: `${sellerOneKeyword}-${RandomGenerator.name(1)}-${RandomGenerator.alphabets(4)}`,
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(sellerOneUpdateTwo);
  const sellerTwoUpdateOne =
    await api.functional.shoppingMall.seller.profile.update(
      sellerTwoConnection,
      {
        body: {
          displayName: `${sellerTwoKeyword}-${RandomGenerator.name(1)}`,
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(sellerTwoUpdateOne);
  const sellerTwoUpdateTwo =
    await api.functional.shoppingMall.seller.profile.update(
      sellerTwoConnection,
      {
        body: {
          displayName: `${sellerTwoKeyword}-${RandomGenerator.name(1)}-${RandomGenerator.alphabets(4)}`,
          phoneNumber: RandomGenerator.mobile(),
        } satisfies IShoppingMallCustomerProfile.IUpdate,
      },
    );
  typia.assert(sellerTwoUpdateTwo);
  const changedAtFrom = new Date(Date.now() - 1000 * 60 * 60).toISOString();
  const changedAtTo = new Date(Date.now() + 1000 * 60 * 60).toISOString();
  const page = 1;
  const limit = 10;
  const request = {
    search: sellerOneKeyword,
    changedAtFrom,
    changedAtTo,
    sortBy: "changed_at",
    sortOrder: "desc",
    page,
    limit,
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  const snapshots =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerOneConnection,
      {
        body: request,
      },
    );
  typia.assert(snapshots);
  const snapshotsAgain =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerOneConnection,
      {
        body: request,
      },
    );
  typia.assert(snapshotsAgain);
  TestValidator.equals(
    "pagination current page matches request",
    snapshots.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    snapshots.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "data length does not exceed requested limit",
    snapshots.data.length <= limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.equals(
    "repeated read keeps the same snapshot ids",
    snapshots.data.map((snapshot) => snapshot.id),
    snapshotsAgain.data.map((snapshot) => snapshot.id),
  );
  const sellerOneKeywordLower = sellerOneKeyword.toLowerCase();
  const sellerTwoKeywordLower = sellerTwoKeyword.toLowerCase();
  for (const snapshot of snapshots.data) {
    const shopNameLower = snapshot.shop_name.toLowerCase();
    const shopDescriptionLower =
      snapshot.shop_description?.toLowerCase() ?? null;
    const changedSummaryLower = snapshot.changed_summary.toLowerCase();
    TestValidator.equals(
      "snapshot belongs to authenticated seller",
      snapshot.sellerProfile.seller.id,
      sellerOneJoin.id,
    );
    TestValidator.notEquals(
      "snapshot does not belong to the second seller",
      snapshot.sellerProfile.seller.id,
      sellerTwoJoin.id,
    );
    TestValidator.predicate(
      "snapshot is within requested date range",
      snapshot.changed_at >= changedAtFrom &&
        snapshot.changed_at <= changedAtTo,
    );
    TestValidator.predicate(
      "snapshot excludes second seller keyword",
      !shopNameLower.includes(sellerTwoKeywordLower) &&
        !(shopDescriptionLower?.includes(sellerTwoKeywordLower) ?? false) &&
        !changedSummaryLower.includes(sellerTwoKeywordLower),
    );
    TestValidator.predicate(
      "snapshot matches requested search within searchable fields",
      shopNameLower.includes(sellerOneKeywordLower) ||
        (shopDescriptionLower?.includes(sellerOneKeywordLower) ?? false) ||
        changedSummaryLower.includes(sellerOneKeywordLower),
    );
  }
  for (let i = 1; i < snapshots.data.length; ++i) {
    TestValidator.predicate(
      "snapshots are sorted by changed_at descending",
      snapshots.data[i - 1].changed_at >= snapshots.data[i].changed_at,
    );
  }
}
