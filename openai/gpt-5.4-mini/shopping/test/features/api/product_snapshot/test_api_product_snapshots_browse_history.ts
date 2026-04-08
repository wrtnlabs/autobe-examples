import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshots_browse_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator browsing immutable product snapshot history.
   *
   * Validates pagination metadata, default newest-first ordering, and the
   * historical snapshot summary fields returned by the product snapshot browse
   * endpoint. The test also confirms the operation is read-only by executing it
   * twice and checking that the same snapshot history is returned without any
   * mutation of the result shape or ordering expectations.
   *
   * 1. Register and authenticate an administrator on an isolated connection.
   * 2. Browse product snapshot history with default paging and sort behavior.
   * 3. Validate pagination metadata and snapshot summary field preservation.
   * 4. Re-browse with the same request to confirm the endpoint remains read-only.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(admin);
  const request = {
    page: 1,
    limit: 10,
    productId: null,
    sort: null,
  } satisfies IMallPlatformProductSnapshot.IRequest;
  const firstPage =
    await api.functional.mallPlatform.administrator.productSnapshots.index(
      adminConnection,
      { body: request },
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "default page number should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested page size should be preserved",
    firstPage.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "pagination record count should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot page data should not exceed limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.data.length > 1) {
    for (let i = 1; i < firstPage.data.length; i++) {
      TestValidator.predicate(
        "snapshots should be ordered newest-first by createdAt when sort is omitted",
        firstPage.data[i - 1].createdAt >= firstPage.data[i].createdAt,
      );
    }
  }
  for (const snapshot of firstPage.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot must preserve the owning product relation",
      snapshot.product.id.length > 0 && snapshot.product.name.length > 0,
    );
    TestValidator.predicate(
      "snapshot kind should be populated",
      snapshot.snapshotKind.length > 0,
    );
    TestValidator.predicate(
      "historical product name should be preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "historical product description should be preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "base price should be non-negative",
      snapshot.basePrice >= 0,
    );
    TestValidator.predicate(
      "image count should be non-negative",
      snapshot.imageCount >= 0,
    );
    TestValidator.predicate(
      "variant count should be non-negative",
      snapshot.variantCount >= 0,
    );
    TestValidator.predicate(
      "snapshot createdAt should be populated",
      snapshot.createdAt.length > 0,
    );
  }
  const secondPage =
    await api.functional.mallPlatform.administrator.productSnapshots.index(
      adminConnection,
      { body: request },
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "read-only browsing should return the same pagination metadata on repeat requests",
    secondPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "read-only browsing should return the same snapshot history on repeat requests",
    secondPage.data,
    firstPage.data,
  );
}
