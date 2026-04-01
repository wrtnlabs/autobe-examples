import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_snapshot_history_after_deletion(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: null,
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(seller);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals(
    "snapshot page current should be first page",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "snapshot page limit should match request",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "snapshot pagination record count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot pagination page count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot records are immutable summaries",
    response.data.every(
      (snapshot) =>
        snapshot.id.length > 0 &&
        snapshot.snapshotKind.length > 0 &&
        snapshot.productName.length > 0 &&
        snapshot.productDescription.length > 0 &&
        typeof snapshot.basePrice === "number" &&
        typeof snapshot.imageCount === "number" &&
        typeof snapshot.variantCount === "number" &&
        snapshot.createdAt.length > 0,
    ),
  );
}
