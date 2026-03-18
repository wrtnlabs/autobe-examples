import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_snapshot_browsing_immutability_metadata_only(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const email = `${Date.now()}_${Math.random()}@example.com`;
  const password = `P@ssw0rd_${Date.now()}`;
  const adminAuthorized = await authorize_admin_join(adminConnection, {
    body: {
      email,
      password,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2) Browse snapshot metadata via PATCH /shoppingMall/admin/snapshots
  const browsingBody: IShoppingMallSnapshot.IRequest = {
    page: 1,
    limit: 5,
  };
  const page1 = await api.functional.shoppingMall.admin.snapshots.index(
    adminConnection,
    {
      body: browsingBody,
    },
  );
  typia.assert(page1);
  // 3) Metadata-only contract
  const summaries1 = page1.data;
  for (const summary of summaries1) {
    typia.assert(summary);
    const allowedKeys = new Set<string>([
      "id",
      "snapshot_code",
      "source_type",
      "source_entity_id",
      "source_seller_id",
      "source_order_id",
      "source_order_item_id",
      "source_review_id",
      "source_cancellation_request_id",
      "source_refund_request_id",
      "created_by_member_id",
      "reason",
      "created_at",
      "updated_at",
      "deleted_at",
    ]);
    for (const key of Object.keys(summary)) {
      TestValidator.predicate(`no unexpected key: ${key}`, () =>
        allowedKeys.has(key),
      );
    }
  }
  // 4) Immutability across repeated queries
  const target = summaries1[0];
  if (target !== undefined) {
    const firstItems = await ArrayUtil.asyncRepeat(3, async () => {
      const page = await api.functional.shoppingMall.admin.snapshots.index(
        adminConnection,
        {
          body: browsingBody,
        },
      );
      typia.assert(page);
      return page.data[0];
    });
    for (const [i, item] of firstItems.entries()) {
      TestValidator.predicate(
        `call ${i + 1} returns at least one item for immutability check`,
        () => item !== undefined,
      );
      typia.assert(item!);
      TestValidator.equals(
        `summary immutable (target vs call ${i + 1})`,
        item!,
        target,
      );
    }
    // Also compare repeated call results against each other
    if (firstItems[0] !== undefined && firstItems[1] !== undefined) {
      TestValidator.equals(
        "summary immutable across repeated calls (1 vs 2)",
        firstItems[0]!,
        firstItems[1]!,
      );
    }
    if (firstItems[1] !== undefined && firstItems[2] !== undefined) {
      TestValidator.equals(
        "summary immutable across repeated calls (2 vs 3)",
        firstItems[1]!,
        firstItems[2]!,
      );
    }
  } else {
    // If empty page, immutability is not applicable; ensure pagination exists.
    TestValidator.predicate(
      "pagination exists",
      () => page1.pagination !== undefined,
    );
  }
}
