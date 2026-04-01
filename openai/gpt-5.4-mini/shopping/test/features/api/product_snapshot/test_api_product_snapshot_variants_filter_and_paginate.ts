import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_variants_filter_and_paginate(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234!Aa" satisfies string,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "snapshot variant list returns valid pagination metadata",
    response.pagination.current >= 0 &&
      response.pagination.limit >= 0 &&
      response.pagination.records >= 0 &&
      response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot variant list respects limit",
    response.data.length <= response.pagination.limit,
  );
  const filteredBySku =
    await api.functional.mallPlatform.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: {
          search: "sku",
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(filteredBySku);
  TestValidator.predicate(
    "search query response has valid pagination metadata",
    filteredBySku.pagination.current >= 0 &&
      filteredBySku.pagination.limit >= 0 &&
      filteredBySku.pagination.records >= 0 &&
      filteredBySku.pagination.pages >= 0,
  );
  const pagedResponse =
    await api.functional.mallPlatform.seller.products.snapshots.variants.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: {
          page: 2,
          limit: 2,
        } satisfies IMallPlatformProductSnapshotVariant.IRequest,
      },
    );
  typia.assert(pagedResponse);
  TestValidator.equals(
    "page size should be requested limit",
    pagedResponse.pagination.limit,
    2,
  );
  TestValidator.equals(
    "page number should match request",
    pagedResponse.pagination.current,
    2,
  );
}
