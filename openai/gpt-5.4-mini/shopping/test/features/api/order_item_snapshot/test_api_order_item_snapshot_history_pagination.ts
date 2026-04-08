import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import type { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import type { IMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshot";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_order_item_snapshot_history_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator browsing of order item snapshot history.
   *
   * Validates that the history endpoint returns a well-formed paginated page,
   * preserves immutable snapshot ordering, and behaves consistently across
   * repeated reads. Since this endpoint exposes read-only history without page
   * parameters in the available SDK surface, the test focuses on metadata
   * integrity and stable newest-first ordering within the returned page.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Read the snapshot history page and validate its pagination metadata.
   * 3. Confirm the returned data is ordered newest-first.
   * 4. Re-read the page to ensure the response is stable.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.history(
      administratorConnection,
    );
  typia.assert(firstPage);
  TestValidator.equals(
    "page current should be the first page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "page limit should be non-negative",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "record count should be non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count should be non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page data should not exceed the limit when limit is positive",
    firstPage.pagination.limit === 0 ||
      firstPage.data.length <= firstPage.pagination.limit,
  );
  if (firstPage.pagination.records === 0) {
    TestValidator.equals(
      "empty result should return no data",
      firstPage.data.length,
      0,
    );
  } else {
    TestValidator.predicate(
      "page data should contain at least one record when records exist",
      firstPage.data.length > 0,
    );
    for (let index = 1; index < firstPage.data.length; index += 1) {
      const previous = firstPage.data[index - 1];
      const current = firstPage.data[index];
      TestValidator.predicate(
        `snapshots should be ordered newest-first at index ${index}`,
        previous.snapshotAt >= current.snapshotAt,
      );
    }
  }
  const secondPage =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.history(
      administratorConnection,
    );
  typia.assert(secondPage);
  TestValidator.equals(
    "repeated reads should preserve pagination metadata",
    secondPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "repeated reads should preserve page contents",
    secondPage.data,
    firstPage.data,
  );
}
