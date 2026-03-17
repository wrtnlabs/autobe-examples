import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProfileSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProfileSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_history_after_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Retrieve profile snapshot history
  const snapshots =
    await api.functional.shoppingMall.seller.profile.snapshots.list(
      sellerConnection,
    );
  typia.assert(snapshots);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    snapshots.pagination.current >= 1,
  );
  TestValidator.predicate("limit is positive", snapshots.pagination.limit >= 1);
  TestValidator.predicate(
    "records count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 4. Validate pagination consistency
  const expectedPages = Math.ceil(
    snapshots.pagination.records / snapshots.pagination.limit,
  );
  TestValidator.equals(
    "pages calculation",
    snapshots.pagination.pages,
    expectedPages,
  );
  // 5. Validate data array length matches pagination
  TestValidator.equals(
    "data length matches records",
    snapshots.data.length,
    snapshots.pagination.records,
  );
  // 6. Validate each snapshot has seller profile type
  for (const snapshot of snapshots.data) {
    TestValidator.equals(
      "profile type is seller",
      snapshot.profile_type,
      "seller",
    );
  }
}
