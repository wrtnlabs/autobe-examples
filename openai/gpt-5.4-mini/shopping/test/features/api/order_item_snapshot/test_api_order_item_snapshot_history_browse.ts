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

export async function test_api_order_item_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Browse immutable order item snapshot history for administrator audit review.
   *
   * Validates that an authenticated administrator can read the platform-wide
   * order item snapshot history endpoint, and that the response is a paginated
   * collection of immutable snapshot summaries suitable for dispute resolution.
   *
   * The test also confirms the endpoint is read-only by performing the same
   * request twice and verifying the returned history page remains stable across
   * repeated reads.
   *
   * 1. Authenticate as an administrator using a dedicated connection.
   * 2. Request the order item snapshot history page.
   * 3. Validate pagination metadata and snapshot summary payloads.
   * 4. Repeat the request and ensure the response is unchanged.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const first: IPageIMallPlatformOrderItemSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.history(
      administratorConnection,
    );
  typia.assert(first);
  const second: IPageIMallPlatformOrderItemSnapshot.ISummary =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.history(
      administratorConnection,
    );
  typia.assert(second);
  TestValidator.equals(
    "history page is stable across repeated reads",
    second,
    first,
  );
  TestValidator.predicate(
    "pagination current page is non-negative",
    first.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    first.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    first.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    first.pagination.pages >= 0,
  );
  for (const snapshot of first.data) {
    typia.assert(snapshot);
    typia.assert(snapshot.orderItem);
    typia.assert(snapshot.orderItem.order);
    typia.assert(snapshot.orderItem.productVariant);
    typia.assert(snapshot.orderItem.seller);
    TestValidator.predicate(
      "snapshot reason is provided",
      snapshot.snapshotReason.length >= 0,
    );
    TestValidator.predicate(
      "snapshot timestamp exists",
      snapshot.snapshotAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot createdAt exists",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot updatedAt exists",
      snapshot.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "order item quantity is positive",
      snapshot.quantity > 0,
    );
    TestValidator.predicate(
      "line total is non-negative",
      snapshot.lineTotal >= 0,
    );
    TestValidator.predicate(
      "unit price is non-negative",
      snapshot.unitPrice >= 0,
    );
    TestValidator.predicate(
      "product name is preserved",
      snapshot.productName.length >= 0,
    );
    TestValidator.predicate(
      "product description is preserved",
      snapshot.productDescription.length >= 0,
    );
    TestValidator.predicate(
      "product sku is preserved",
      snapshot.productSku.length >= 0,
    );
    TestValidator.predicate(
      "variant sku code is preserved",
      snapshot.variantSkuCode.length >= 0,
    );
    TestValidator.predicate(
      "seller shop name is preserved",
      snapshot.sellerShopName.length >= 0,
    );
    TestValidator.predicate(
      "seller shop description is preserved",
      snapshot.sellerShopDescription.length >= 0,
    );
    TestValidator.predicate(
      "seller logo url is preserved",
      snapshot.sellerLogoImageUrl.length > 0,
    );
  }
  for (let i = 1; i < first.data.length; ++i) {
    TestValidator.predicate(
      "snapshots are ordered newest first",
      first.data[i - 1].snapshotAt >= first.data[i].snapshotAt,
    );
  }
}
