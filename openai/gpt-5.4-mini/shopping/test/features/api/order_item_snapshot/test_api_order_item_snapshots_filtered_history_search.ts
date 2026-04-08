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

/**
 * Search filtered order item snapshot history for administrator dispute review.
 *
 * Validates that an administrator can query immutable order item snapshot history
 * using snapshot-time bounds and pagination while preserving the returned order
 * and the related order-item context needed for audit and dispute resolution.
 * The test checks that the response is a coherent paginated page, that the
 * returned snapshots remain sorted from newest to oldest, and that the
 * read-only lookup preserves the immutable snapshot content.
 *
 * Because this scenario is backed only by the available snapshot-history read
 * endpoint, the test focuses on response filtering, pagination coherence, sort
 * order, and snapshot context preservation without relying on unavailable data
 * creation fixtures.
 *
 * 1. Register an administrator and build an isolated authorized connection.
 * 2. Query snapshot history with time-range bounds and pagination.
 * 3. Validate page metadata, descending order, and preserved snapshot context.
 */
export async function test_api_order_item_snapshots_filtered_history_search(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const snapshotAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 30,
  ).toISOString();
  const snapshotAtTo = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
  const request = {
    snapshotAtFrom,
    snapshotAtTo,
    page: 1,
    limit: 10,
    sort: "-snapshotAt",
  } satisfies IMallPlatformOrderItemSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.administrator.orderItemSnapshots.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals("requested page number", output.pagination.current, 1);
  TestValidator.equals("requested page size", output.pagination.limit, 10);
  TestValidator.predicate(
    "record count is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "response size does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  TestValidator.predicate(
    "page count matches record count and limit when limit is positive",
    output.pagination.limit > 0
      ? output.pagination.pages ===
          Math.ceil(output.pagination.records / output.pagination.limit)
      : true,
  );
  if (output.data.length > 1) {
    for (let i = 1; i < output.data.length; i++) {
      TestValidator.predicate(
        "snapshots sorted newest first by snapshotAt",
        output.data[i - 1].snapshotAt >= output.data[i].snapshotAt,
      );
    }
  }
  for (const snapshot of output.data) {
    TestValidator.predicate(
      "snapshot time is within lower bound",
      snapshot.snapshotAt >= snapshotAtFrom,
    );
    TestValidator.predicate(
      "snapshot time is within upper bound",
      snapshot.snapshotAt <= snapshotAtTo,
    );
    TestValidator.predicate(
      "snapshot has linked order item",
      snapshot.orderItem.id.length > 0,
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
      "product name preserved",
      snapshot.productName.length > 0,
    );
    TestValidator.predicate(
      "product description preserved",
      snapshot.productDescription.length > 0,
    );
    TestValidator.predicate(
      "product sku preserved",
      snapshot.productSku.length > 0,
    );
    TestValidator.predicate(
      "variant sku preserved",
      snapshot.variantSkuCode.length > 0,
    );
    TestValidator.predicate(
      "seller shop name preserved",
      snapshot.sellerShopName.length > 0,
    );
    TestValidator.predicate(
      "seller shop description preserved",
      snapshot.sellerShopDescription.length > 0,
    );
    TestValidator.predicate(
      "seller logo image url preserved",
      snapshot.sellerLogoImageUrl.length > 0,
    );
    TestValidator.predicate(
      "snapshot deletion marker remains immutable or absent",
      snapshot.deletedAt === null || snapshot.deletedAt.length > 0,
    );
  }
}
