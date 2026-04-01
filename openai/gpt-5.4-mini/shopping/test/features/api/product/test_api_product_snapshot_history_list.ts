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

export async function test_api_product_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com/seller/join",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(authorized);
  const pageRequest = {
    page: 1,
    limit: 10,
  } satisfies IMallPlatformProductSnapshot.IRequest;
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId: authorized.id,
        body: pageRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("requested page", response.pagination.current, 1);
  TestValidator.equals("requested limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "returned snapshot count does not exceed page limit",
    response.data.length <= response.pagination.limit,
  );
  if (response.data.length > 1) {
    for (let i = 1; i < response.data.length; ++i) {
      TestValidator.predicate(
        "snapshots are ordered newest first",
        response.data[i - 1].createdAt >= response.data[i].createdAt,
      );
    }
  }
  for (const snapshot of response.data) {
    TestValidator.equals(
      "snapshot product name exists",
      typeof snapshot.productName,
      "string",
    );
    TestValidator.equals(
      "snapshot product description exists",
      typeof snapshot.productDescription,
      "string",
    );
    TestValidator.equals(
      "snapshot base price is numeric",
      typeof snapshot.basePrice,
      "number",
    );
    TestValidator.equals(
      "snapshot image count is numeric",
      typeof snapshot.imageCount,
      "number",
    );
    TestValidator.equals(
      "snapshot variant count is numeric",
      typeof snapshot.variantCount,
      "number",
    );
    TestValidator.equals(
      "snapshot createdAt is timestamp string",
      typeof snapshot.createdAt,
      "string",
    );
  }
}
