import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_order_item_snapshot_variant_options_browse(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(joinConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@test.com`,
      password: `P@ssw0rd${RandomGenerator.alphabets(6)}`,
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: seller.token.access,
  };
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const search = RandomGenerator.alphabets(4);
  const request: IMallPlatformOrderItemSnapshotVariantOption.IRequest = {
    page: 1,
    limit: 20,
    search,
    sort: "+optionName",
  };
  const output =
    await api.functional.mallPlatform.seller.order_items.snapshots.variant_options.index(
      sellerConnection,
      {
        orderItemId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current page",
    output.pagination.current,
    request.page ?? 1,
  );
  TestValidator.equals(
    "pagination limit",
    output.pagination.limit,
    request.limit ?? output.pagination.limit,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  const repeated =
    await api.functional.mallPlatform.seller.order_items.snapshots.variant_options.index(
      sellerConnection,
      {
        orderItemId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "stable ordering for identical explicit sort requests",
    repeated.data,
    output.data,
  );
  if (output.data.length > 0) {
    for (const row of output.data) {
      TestValidator.predicate(
        "search filters preserved option fields",
        row.optionName.toLowerCase().includes(search.toLowerCase()) ||
          row.optionValue.toLowerCase().includes(search.toLowerCase()),
      );
    }
  }
  const unsorted =
    await api.functional.mallPlatform.seller.order_items.snapshots.variant_options.index(
      sellerConnection,
      {
        orderItemId,
        snapshotId,
        body: {
          page: 1,
          limit: 20,
          search,
        },
      },
    );
  typia.assert(unsorted);
  TestValidator.equals(
    "stable ordering when sort is omitted",
    unsorted.data,
    await api.functional.mallPlatform.seller.order_items.snapshots.variant_options
      .index(sellerConnection, {
        orderItemId,
        snapshotId,
        body: {
          page: 1,
          limit: 20,
          search,
        },
      })
      .then((value) => {
        typia.assert(value);
        return value.data;
      }),
  );
}
