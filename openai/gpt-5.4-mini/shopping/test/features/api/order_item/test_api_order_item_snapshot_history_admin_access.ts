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

export async function test_api_order_item_snapshot_history_admin_access(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const output =
    await api.functional.mallPlatform.administrator.orderItems.snapshots.index(
      adminConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          page: 1,
          limit: 10,
          sort: "createdAt_desc",
        } satisfies IMallPlatformOrderItemSnapshot.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "pagination current should match the requested page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should match the requested limit",
    output.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    output.pagination.pages >= 0,
  );
  for (const snapshot of output.data) {
    TestValidator.predicate(
      "snapshot timestamp should be present",
      snapshot.snapshotAt.length > 0,
    );
    TestValidator.predicate(
      "snapshot reason should be present",
      snapshot.snapshotReason.length > 0,
    );
    TestValidator.predicate(
      "order item status should be present",
      snapshot.orderItemStatus.length > 0,
    );
    TestValidator.predicate(
      "product name should be present",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "product description should be present",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "product sku should be present",
      snapshot.productSku.length > 0,
    );
    TestValidator.predicate(
      "variant sku code should be present",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "seller shop name should be present",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "seller shop description should be present",
      snapshot.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller logo image url should be present",
      snapshot.sellerLogoImageUrl.length > 0,
    );
    TestValidator.predicate(
      "unit price should be non-negative",
      snapshot.unitPrice >= 0,
    );
    TestValidator.predicate(
      "quantity should be positive",
      snapshot.quantity > 0,
    );
    TestValidator.predicate(
      "line total should be non-negative",
      snapshot.lineTotal >= 0,
    );
    TestValidator.predicate(
      "createdAt should be present",
      snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt should be present",
      snapshot.updatedAt.length > 0,
    );
    TestValidator.equals(
      "deletedAt should be null or a timestamp string",
      snapshot.deletedAt === null || typeof snapshot.deletedAt === "string",
      true,
    );
  }
}
