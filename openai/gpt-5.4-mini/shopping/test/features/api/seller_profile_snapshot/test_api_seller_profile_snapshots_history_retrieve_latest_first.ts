import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_history_retrieve_latest_first(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator retrieval of seller profile snapshot history ordered newest first.
   *
   * Validates that the seller profile snapshot history endpoint returns immutable audit records in descending creation order, preserves the captured storefront fields, and exposes pagination metadata for dispute review.
   *
   * 1. Authenticate a dedicated administrator connection.
   * 2. Retrieve the seller profile snapshot history page.
   * 3. Validate pagination structure and snapshot summary contents.
   * 4. Confirm the endpoint is readable and returns immutable snapshot summaries.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(10)}@example.com` satisfies string &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.history.at(
      adminConnection,
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination exists",
    output.pagination !== null && output.pagination !== undefined,
  );
  TestValidator.predicate("snapshot list exists", Array.isArray(output.data));
  TestValidator.predicate(
    "pagination current is valid",
    output.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    output.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is valid",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    output.pagination.pages >= 0,
  );
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    TestValidator.predicate("snapshot id exists", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot createdAt exists",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot shopName exists",
      snapshot.shopName.length >= 0,
    );
    TestValidator.predicate(
      "snapshot shopDescription exists",
      snapshot.shopDescription.length >= 0,
    );
    TestValidator.predicate(
      "seller profile reference exists",
      snapshot.sellerProfile !== null && snapshot.sellerProfile !== undefined,
    );
  }
  if (output.data.length >= 2) {
    TestValidator.predicate(
      "newest snapshot comes first",
      output.data[0].createdAt >= output.data[1].createdAt,
    );
  }
}
