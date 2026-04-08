import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Retrieve historical product snapshot variant rows for administrator review.
 *
 * Validates that an authenticated administrator can access the preserved variant rows belonging to a product snapshot and that the response is returned as a paginated page.
 *
 * The test focuses on the immutable snapshot truth fields exposed by the endpoint, including SKU code, option values, optional price override, availability, and creation timestamp. It also confirms that the parent snapshot references are present and that the returned rows can be treated as historical snapshot data rather than live product-variant state.
 *
 * 1. Authenticate as an administrator.
 * 2. Request the variant history page for a product snapshot.
 * 3. Validate pagination metadata and immutable row fields.
 * 4. Confirm the rows are ordered by creation time ascending.
 */
export async function test_api_product_snapshot_variants_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const response =
    await api.functional.mallPlatform.administrator.products.snapshots.variants.getByProductidAndSnapshotid(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(response);
  TestValidator.predicate(
    "pagination record count should be non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination current page should be non-negative",
    response.pagination.current >= 0,
  );
  const ordered = [...response.data].sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  TestValidator.equals(
    "variant history should be ordered by createdAt ascending",
    response.data,
    ordered,
  );
  for (const row of response.data) {
    TestValidator.predicate(
      "history row should expose a SKU code",
      row.skuCode.length > 0,
    );
    TestValidator.predicate(
      "history row should expose option values",
      row.optionValues.length > 0,
    );
    TestValidator.predicate(
      "history row should expose availability state",
      typeof row.isAvailable === "boolean",
    );
    TestValidator.predicate(
      "history row should expose createdAt timestamp",
      row.createdAt.length > 0,
    );
    TestValidator.predicate(
      "history row should include parent snapshot reference",
      row.productSnapshot.id.length > 0,
    );
  }
}
