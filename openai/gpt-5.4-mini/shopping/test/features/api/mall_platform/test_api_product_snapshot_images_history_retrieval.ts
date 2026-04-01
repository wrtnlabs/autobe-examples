import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_images_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "asc",
  } satisfies IMallPlatformProductSnapshotImage.IRequest;
  const output =
    await api.functional.mallPlatform.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data length does not exceed page limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "pagination pages are coherent with records and limit",
    output.pagination.limit > 0
      ? output.pagination.pages >=
          Math.ceil(output.pagination.records / output.pagination.limit)
      : output.pagination.pages >= 0,
  );
  if (output.data.length > 0) {
    TestValidator.equals(
      "images are returned in preserved ascending sort order",
      output.data.map((image) => image.sortOrder),
      [...output.data].map((image) => image.sortOrder).sort((a, b) => a - b),
    );
    const first = output.data[0];
    const last = output.data[output.data.length - 1];
    typia.assert(first);
    typia.assert(last);
    TestValidator.equals(
      "parent snapshot id preserved",
      first.productSnapshot.id,
      snapshotId,
    );
    TestValidator.equals(
      "parent snapshot id preserved on last item",
      last.productSnapshot.id,
      snapshotId,
    );
    TestValidator.predicate(
      "first image uri exists",
      first.imageUri.length > 0,
    );
    TestValidator.predicate("last image uri exists", last.imageUri.length > 0);
    TestValidator.predicate(
      "first sort order non-negative",
      first.sortOrder >= 0,
    );
    TestValidator.predicate(
      "last sort order non-negative",
      last.sortOrder >= 0,
    );
    TestValidator.predicate(
      "first image has createdAt timestamp",
      first.createdAt.length > 0,
    );
    TestValidator.predicate(
      "last image has createdAt timestamp",
      last.createdAt.length > 0,
    );
  }
  const repeated =
    await api.functional.mallPlatform.seller.products.snapshots.images.index(
      sellerConnection,
      {
        productId,
        snapshotId,
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals("repeated retrieval remains stable", repeated, output);
}
