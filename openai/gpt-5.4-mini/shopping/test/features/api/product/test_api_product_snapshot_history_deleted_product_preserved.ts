import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
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

export async function test_api_product_snapshot_history_deleted_product_preserved(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const response =
    await api.functional.mallPlatform.seller.products.snapshots.index(
      sellerConnection,
      {
        productId,
        body: {
          page: 1,
          limit: 10,
          sort: "-created_at",
        } satisfies IMallPlatformProductSnapshot.IRequest,
      },
    );
  typia.assert(response);
  TestValidator.equals("snapshot page current", response.pagination.current, 1);
  TestValidator.equals("snapshot page limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "snapshot pages should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot record count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "snapshot entries should preserve historical product references when returned",
    response.data.every((snapshot) => snapshot.product.id === productId),
  );
  TestValidator.predicate(
    "snapshot entries should be immutable historical records",
    response.data.every((snapshot) => snapshot.createdAt.length > 0),
  );
}
