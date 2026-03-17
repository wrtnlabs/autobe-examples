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

export async function test_api_seller_profile_snapshot_history_after_profile_edits(
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
    },
  });
  typia.assert(authorized);
  const firstUpdateBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const firstUpdatedProfile =
    await api.functional.shoppingMall.seller.profile.update(sellerConnection, {
      body: firstUpdateBody,
    });
  typia.assert(firstUpdatedProfile);
  const secondUpdateBody = {
    displayName: RandomGenerator.name(),
    phoneNumber: RandomGenerator.mobile(),
  } satisfies IShoppingMallCustomerProfile.IUpdate;
  const secondUpdatedProfile =
    await api.functional.shoppingMall.seller.profile.update(sellerConnection, {
      body: secondUpdateBody,
    });
  typia.assert(secondUpdatedProfile);
  const defaultHistory =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(defaultHistory);
  const pagedRequest = {
    sortBy: "changed_at",
    sortOrder: "desc",
    page: 1,
    limit: 100,
  } satisfies IShoppingMallSellerProfileSnapshot.IRequest;
  const pagedHistory =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: pagedRequest,
      },
    );
  typia.assert(pagedHistory);
  const rereadHistory =
    await api.functional.shoppingMall.seller.profile.snapshots.index(
      sellerConnection,
      {
        body: pagedRequest,
      },
    );
  typia.assert(rereadHistory);
  TestValidator.equals(
    "requested current page is echoed",
    pagedHistory.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is echoed",
    pagedHistory.pagination.limit,
    100,
  );
  TestValidator.equals(
    "re-reading snapshot history is stable",
    rereadHistory.data,
    pagedHistory.data,
  );
  TestValidator.equals(
    "re-reading snapshot pagination is stable",
    rereadHistory.pagination,
    pagedHistory.pagination,
  );
  TestValidator.predicate(
    "pagination record count covers current page size",
    pagedHistory.pagination.records >= pagedHistory.data.length,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    pagedHistory.pagination.pages >= 0,
  );
  for (let i = 1; i < pagedHistory.data.length; ++i) {
    const previous = pagedHistory.data[i - 1];
    const current = pagedHistory.data[i];
    TestValidator.predicate(
      `changed_at is descending at index ${i}`,
      previous.changed_at >= current.changed_at,
    );
  }
  for (let i = 0; i < pagedHistory.data.length; ++i) {
    TestValidator.equals(
      `snapshot entry remains immutable while browsing at index ${i}`,
      rereadHistory.data[i],
      pagedHistory.data[i],
    );
  }
  if (defaultHistory.data.length !== 0 && pagedHistory.data.length !== 0) {
    TestValidator.equals(
      "default retrieval starts with newest snapshot",
      defaultHistory.data[0],
      pagedHistory.data[0],
    );
  }
  if (pagedHistory.data.length !== 0) {
    const newest = pagedHistory.data[0];
    const rereadNewest = rereadHistory.data[0];
    TestValidator.equals(
      "newest snapshot is unchanged after browsing",
      rereadNewest,
      newest,
    );
    TestValidator.equals(
      "snapshot belongs to authenticated seller",
      newest.sellerProfile.seller.id,
      authorized.id,
    );
  } else {
    TestValidator.equals(
      "empty page contains no snapshot entries",
      pagedHistory.data.length,
      0,
    );
  }
}
