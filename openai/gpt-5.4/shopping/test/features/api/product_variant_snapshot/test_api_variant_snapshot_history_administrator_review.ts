import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_variant_snapshot_history_administrator_review(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator = await authorize_administrator_join(
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
  typia.assert(administrator);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const requestedPage = 1 satisfies number as number;
  const requestedLimit = 10 satisfies number as number;
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString() satisfies string as string & tags.Format<"date-time">;
  const createdAtTo = new Date().toISOString() satisfies string as string &
    tags.Format<"date-time">;
  const firstRequest = {
    page: requestedPage satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: requestedLimit satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    created_at_from: createdAtFrom,
    created_at_to: createdAtTo,
    change_summary: RandomGenerator.alphabets(6),
    sort: "-created_at",
  } satisfies IShoppingMallProductVariantSnapshot.IRequest;
  const firstPage =
    await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
      administratorConnection,
      {
        productId,
        variantId,
        body: firstRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "pagination current matches requested page",
    firstPage.pagination.current,
    requestedPage,
  );
  TestValidator.equals(
    "pagination limit matches requested limit",
    firstPage.pagination.limit,
    requestedLimit,
  );
  TestValidator.predicate(
    "page data length does not exceed requested limit",
    firstPage.data.length <= requestedLimit,
  );
  TestValidator.predicate(
    "page data length does not exceed pagination limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "current page is non-negative",
    firstPage.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination pages align with records and limit",
    firstPage.pagination.limit === 0
      ? firstPage.pagination.pages === 0
      : firstPage.pagination.pages ===
          Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  for (const snapshot of firstPage.data) {
    TestValidator.equals(
      "snapshot variant matches requested variant",
      snapshot.productVariant.id,
      variantId,
    );
    TestValidator.predicate(
      "snapshot createdAt is within requested lower bound",
      new Date(snapshot.createdAt).getTime() >=
        new Date(createdAtFrom).getTime(),
    );
    TestValidator.predicate(
      "snapshot createdAt is within requested upper bound",
      new Date(snapshot.createdAt).getTime() <= new Date(createdAtTo).getTime(),
    );
    if (snapshot.productSnapshot !== null) {
      TestValidator.equals(
        "product snapshot references requested product",
        snapshot.productSnapshot.product.id,
        productId,
      );
    }
  }
  for (let i = 1; i < firstPage.data.length; ++i) {
    const previous = firstPage.data[i - 1];
    const current = firstPage.data[i];
    TestValidator.predicate(
      "snapshots are ordered newest first",
      new Date(previous.createdAt).getTime() >=
        new Date(current.createdAt).getTime(),
    );
  }
  if (firstPage.data.length > 0) {
    const sampled = firstPage.data[0];
    const searchTokenSource = sampled.changeSummary.trim();
    const searchToken =
      searchTokenSource.length > 3
        ? searchTokenSource.slice(0, Math.floor(searchTokenSource.length / 2))
        : searchTokenSource;
    const narrowedRequest = {
      page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: requestedLimit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      created_at_from: sampled.createdAt,
      created_at_to: createdAtTo,
      change_summary: searchToken,
      sort: "-created_at",
    } satisfies IShoppingMallProductVariantSnapshot.IRequest;
    const narrowedPage =
      await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
        administratorConnection,
        {
          productId,
          variantId,
          body: narrowedRequest,
        },
      );
    typia.assert(narrowedPage);
    TestValidator.equals(
      "narrowed pagination current matches requested page",
      narrowedPage.pagination.current,
      1,
    );
    TestValidator.equals(
      "narrowed pagination limit matches requested limit",
      narrowedPage.pagination.limit,
      requestedLimit,
    );
    TestValidator.predicate(
      "narrowed result count does not exceed original records",
      narrowedPage.pagination.records <= firstPage.pagination.records,
    );
    for (const snapshot of narrowedPage.data) {
      TestValidator.equals(
        "narrowed snapshot variant matches requested variant",
        snapshot.productVariant.id,
        variantId,
      );
      TestValidator.predicate(
        "narrowed snapshot createdAt respects lower bound",
        new Date(snapshot.createdAt).getTime() >=
          new Date(narrowedRequest.created_at_from ?? createdAtFrom).getTime(),
      );
      TestValidator.predicate(
        "narrowed snapshot createdAt respects upper bound",
        new Date(snapshot.createdAt).getTime() <=
          new Date(narrowedRequest.created_at_to ?? createdAtTo).getTime(),
      );
      TestValidator.predicate(
        "narrowed snapshot change summary contains search text",
        snapshot.changeSummary.includes(searchToken),
      );
    }
  } else {
    const alternatePageNumber = 2 satisfies number as number;
    const alternateLimit = 5 satisfies number as number;
    const alternateRequest = {
      page: alternatePageNumber satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      limit: alternateLimit satisfies number as number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
      created_at_from: createdAtFrom,
      created_at_to: createdAtTo,
      sort: "-created_at",
    } satisfies IShoppingMallProductVariantSnapshot.IRequest;
    const alternatePage =
      await api.functional.shoppingMall.administrator.products.variants.snapshots.index(
        administratorConnection,
        {
          productId,
          variantId,
          body: alternateRequest,
        },
      );
    typia.assert(alternatePage);
    TestValidator.equals(
      "alternate pagination current matches requested page",
      alternatePage.pagination.current,
      alternatePageNumber,
    );
    TestValidator.equals(
      "alternate pagination limit matches requested limit",
      alternatePage.pagination.limit,
      alternateLimit,
    );
    TestValidator.predicate(
      "alternate page data length does not exceed requested limit",
      alternatePage.data.length <= alternateLimit,
    );
  }
}
