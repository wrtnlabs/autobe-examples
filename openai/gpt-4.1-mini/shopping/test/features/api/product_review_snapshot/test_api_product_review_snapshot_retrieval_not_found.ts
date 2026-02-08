import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_review_snapshot_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Set Authorization header with access token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Use a random UUID that does not exist in the product review snapshots
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // Expect an HttpError with 404 status code when fetching the non-existent snapshot
  await TestValidator.httpError(
    "fetching non-existent product review snapshot returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.productReviewSnapshots.at(
        adminConnection,
        {
          productReviewSnapshotId: nonExistentId,
        },
      );
    },
  );
}
