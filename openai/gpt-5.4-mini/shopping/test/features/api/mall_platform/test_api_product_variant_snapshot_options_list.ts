import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_snapshot_options_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "password123!" satisfies string & tags.Format<"password">,
      href: "https://example.com/register" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com/" satisfies string & tags.Format<"uri">,
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformProductVariantSnapshotOption.IRequest = {
    page: 1,
    limit: 10,
    sort: "+optionKey",
  };
  const first =
    await api.functional.mallPlatform.seller.products.variantSnapshots.options.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(first);
  const second =
    await api.functional.mallPlatform.seller.products.variantSnapshots.options.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(second);
  TestValidator.equals(
    "pagination current should match request",
    first.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match request",
    first.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    first.pagination.pages >= 0,
  );
  TestValidator.equals(
    "stable pagination metadata",
    first.pagination,
    second.pagination,
  );
  TestValidator.equals("stable option rows", first.data, second.data);
  TestValidator.predicate(
    "option row shape should be normalized",
    first.data.every(
      (row) =>
        typeof row.id === "string" &&
        typeof row.optionKey === "string" &&
        typeof row.optionValue === "string",
    ),
  );
  const searchTerm = "color";
  const filtered =
    await api.functional.mallPlatform.seller.products.variantSnapshots.options.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: {
          page: 1,
          limit: 10,
          search: searchTerm,
          sort: "+optionValue",
        } satisfies IMallPlatformProductVariantSnapshotOption.IRequest,
      },
    );
  typia.assert(filtered);
  TestValidator.predicate(
    "filtered result should not exceed unfiltered result count",
    filtered.pagination.records <= first.pagination.records,
  );
  TestValidator.predicate(
    "filtered rows should match the search term when present",
    filtered.data.every((row) => {
      const key = row.optionKey.toLowerCase();
      const value = row.optionValue.toLowerCase();
      return key.includes(searchTerm) || value.includes(searchTerm);
    }),
  );
}
