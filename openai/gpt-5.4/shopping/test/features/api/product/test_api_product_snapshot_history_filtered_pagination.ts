import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_history_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(authorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const baseTime = new Date();
  const createdAtFrom = new Date(
    baseTime.getTime() - 1000 * 60 * 60,
  ).toISOString();
  const createdAtTo = new Date(
    baseTime.getTime() + 1000 * 60 * 60,
  ).toISOString();
  const createdAtFromTime = new Date(createdAtFrom).getTime();
  const createdAtToTime = new Date(createdAtTo).getTime();
  const page = 1;
  const limit = 10;
  const ascendingRequest = {
    createdAtFrom,
    createdAtTo,
    sort: "created_at_asc",
    page,
    limit,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const ascendingPage =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      administratorConnection,
      {
        productId,
        body: ascendingRequest,
      },
    );
  typia.assert(ascendingPage);
  TestValidator.equals(
    "ascending current page matches request",
    ascendingPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "ascending limit matches request",
    ascendingPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "ascending data length within limit",
    ascendingPage.data.length <= ascendingPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "ascending zero pages only when no records",
    ascendingPage.pagination.pages === 0,
    ascendingPage.pagination.records === 0,
  );
  TestValidator.equals(
    "ascending pagination pages formula",
    ascendingPage.pagination.pages,
    ascendingPage.pagination.records === 0
      ? 0
      : Math.ceil(
          ascendingPage.pagination.records / ascendingPage.pagination.limit,
        ),
  );
  TestValidator.predicate(
    "ascending pages positive when records exist",
    ascendingPage.pagination.records === 0 ||
      ascendingPage.pagination.pages >= 1,
  );
  for (let i = 0; i < ascendingPage.data.length; ++i) {
    const snapshot = ascendingPage.data[i];
    const snapshotCreatedAt = new Date(snapshot.created_at).getTime();
    TestValidator.equals(
      "ascending snapshot product matches scope",
      snapshot.product.id,
      productId,
    );
    TestValidator.predicate(
      "ascending snapshot created_at within lower bound",
      snapshotCreatedAt >= createdAtFromTime,
    );
    TestValidator.predicate(
      "ascending snapshot created_at within upper bound",
      snapshotCreatedAt <= createdAtToTime,
    );
    if (i !== 0) {
      TestValidator.predicate(
        "ascending snapshots are ordered by created_at",
        new Date(ascendingPage.data[i - 1].created_at).getTime() <=
          snapshotCreatedAt,
      );
    }
  }
  const descendingRequest = {
    createdAtFrom,
    createdAtTo,
    sort: "created_at_desc",
    page,
    limit,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const descendingPage =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      administratorConnection,
      {
        productId,
        body: descendingRequest,
      },
    );
  typia.assert(descendingPage);
  TestValidator.equals(
    "descending current page matches request",
    descendingPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "descending limit matches request",
    descendingPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "descending data length within limit",
    descendingPage.data.length <= descendingPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "descending zero pages only when no records",
    descendingPage.pagination.pages === 0,
    descendingPage.pagination.records === 0,
  );
  TestValidator.equals(
    "descending pagination pages formula",
    descendingPage.pagination.pages,
    descendingPage.pagination.records === 0
      ? 0
      : Math.ceil(
          descendingPage.pagination.records / descendingPage.pagination.limit,
        ),
  );
  for (let i = 0; i < descendingPage.data.length; ++i) {
    const snapshot = descendingPage.data[i];
    const snapshotCreatedAt = new Date(snapshot.created_at).getTime();
    TestValidator.equals(
      "descending snapshot product matches scope",
      snapshot.product.id,
      productId,
    );
    TestValidator.predicate(
      "descending snapshot created_at within lower bound",
      snapshotCreatedAt >= createdAtFromTime,
    );
    TestValidator.predicate(
      "descending snapshot created_at within upper bound",
      snapshotCreatedAt <= createdAtToTime,
    );
    if (i !== 0) {
      TestValidator.predicate(
        "descending snapshots are ordered by created_at",
        new Date(descendingPage.data[i - 1].created_at).getTime() >=
          snapshotCreatedAt,
      );
    }
  }
  const pagedRequest = {
    createdAtFrom,
    createdAtTo,
    sort: "created_at_asc",
    page: 2,
    limit: 1,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const pagedResponse =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      administratorConnection,
      {
        productId,
        body: pagedRequest,
      },
    );
  typia.assert(pagedResponse);
  TestValidator.equals(
    "paged current page matches request",
    pagedResponse.pagination.current,
    pagedRequest.page,
  );
  TestValidator.equals(
    "paged limit matches request",
    pagedResponse.pagination.limit,
    pagedRequest.limit,
  );
  TestValidator.equals(
    "paged data length within limit",
    pagedResponse.data.length <= pagedResponse.pagination.limit,
    true,
  );
  TestValidator.equals(
    "paged zero pages only when no records",
    pagedResponse.pagination.pages === 0,
    pagedResponse.pagination.records === 0,
  );
  TestValidator.equals(
    "paged pagination pages formula",
    pagedResponse.pagination.pages,
    pagedResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          pagedResponse.pagination.records / pagedResponse.pagination.limit,
        ),
  );
  TestValidator.predicate(
    "paged empty when requesting beyond available pages",
    pagedResponse.pagination.pages === 0 ||
      pagedResponse.pagination.current <= pagedResponse.pagination.pages ||
      pagedResponse.data.length === 0,
  );
  const idCandidate =
    ascendingPage.data[0]?.id ?? typia.random<string & tags.Format<"uuid">>();
  const idFilteredRequest = {
    id: idCandidate,
    createdAtFrom,
    createdAtTo,
    sort: "created_at_asc",
    page,
    limit,
  } satisfies IShoppingMallProductSnapshot.IRequest;
  const idFilteredPage =
    await api.functional.shoppingMall.administrator.products.snapshots.index(
      administratorConnection,
      {
        productId,
        body: idFilteredRequest,
      },
    );
  typia.assert(idFilteredPage);
  TestValidator.equals(
    "id filtered current page matches request",
    idFilteredPage.pagination.current,
    page,
  );
  TestValidator.equals(
    "id filtered limit matches request",
    idFilteredPage.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "id filtered data length within limit",
    idFilteredPage.data.length <= idFilteredPage.pagination.limit,
    true,
  );
  TestValidator.equals(
    "id filtered zero pages only when no records",
    idFilteredPage.pagination.pages === 0,
    idFilteredPage.pagination.records === 0,
  );
  TestValidator.equals(
    "id filtered pagination pages formula",
    idFilteredPage.pagination.pages,
    idFilteredPage.pagination.records === 0
      ? 0
      : Math.ceil(
          idFilteredPage.pagination.records / idFilteredPage.pagination.limit,
        ),
  );
  for (const snapshot of idFilteredPage.data) {
    const snapshotCreatedAt = new Date(snapshot.created_at).getTime();
    TestValidator.equals(
      "id filtered snapshot matches requested id",
      snapshot.id,
      idCandidate,
    );
    TestValidator.equals(
      "id filtered snapshot product matches scope",
      snapshot.product.id,
      productId,
    );
    TestValidator.predicate(
      "id filtered snapshot created_at within lower bound",
      snapshotCreatedAt >= createdAtFromTime,
    );
    TestValidator.predicate(
      "id filtered snapshot created_at within upper bound",
      snapshotCreatedAt <= createdAtToTime,
    );
  }
}
