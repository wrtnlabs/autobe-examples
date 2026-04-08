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
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
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

export async function test_api_order_item_snapshot_history_preserved_after_source_changes(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string &
        tags.Format<"email">,
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(authorized);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = authorized.token.access;
  const snapshots =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.getByOrderitemid(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshots);
  TestValidator.predicate(
    "pagination current page is non-negative",
    snapshots.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    snapshots.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination record count is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list is available",
    Array.isArray(snapshots.data),
  );
  if (snapshots.data.length > 0) {
    const snapshot = snapshots.data[0];
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot timestamp exists",
      snapshot.snapshotAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason exists",
      snapshot.snapshotReason.length >= 0,
    );
    TestValidator.predicate(
      "preserved product name exists",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "preserved product description exists",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "preserved seller shop name exists",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "preserved seller description exists",
      snapshot.sellerShopDescription.length >= 0,
    );
    TestValidator.predicate(
      "preserved SKU exists",
      snapshot.productSku.length > 0,
    );
    TestValidator.predicate(
      "preserved variant SKU exists",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "preserved unit price is non-negative",
      snapshot.unitPrice >= 0,
    );
    TestValidator.predicate(
      "preserved quantity is positive",
      snapshot.quantity > 0,
    );
    TestValidator.predicate(
      "preserved line total is non-negative",
      snapshot.lineTotal >= 0,
    );
  }
}
