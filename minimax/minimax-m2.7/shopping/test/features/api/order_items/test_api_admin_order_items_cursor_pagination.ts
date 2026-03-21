import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_order_items_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Request first page with limit=5
  const firstPage = await api.functional.ecommerceMall.admin.order_items.index(
    adminConnection,
    {
      body: {
        limit: 5,
        sort_by: "created_at",
        sort_direction: "desc",
      } satisfies IEcommerceMallOrderItem.IRequest,
    },
  );
  typia.assert(firstPage);
  // 3. Validate first page
  TestValidator.equals("first page limit", firstPage.data.length <= 5, true);
  TestValidator.equals(
    "pagination records >= data length",
    firstPage.pagination.records >= firstPage.data.length,
    true,
  );
  // 4. Extract cursor and request second page (only if there are more items)
  if (firstPage.pagination.pages > 1) {
    // Get cursor from last item's created_at and id for next page
    const lastItem = firstPage.data[firstPage.data.length - 1];
    const cursorValue = lastItem.created_at;
    const secondPage =
      await api.functional.ecommerceMall.admin.order_items.index(
        adminConnection,
        {
          body: {
            limit: 5,
            cursor: cursorValue,
            sort_by: "created_at",
            sort_direction: "desc",
          } satisfies IEcommerceMallOrderItem.IRequest,
        },
      );
    typia.assert(secondPage);
    // 5. Validate second page has different items (no duplicates)
    const firstPageIds = firstPage.data.map((item) => item.id);
    const secondPageIds = secondPage.data.map((item) => item.id);
    for (const id of secondPageIds) {
      TestValidator.equals(
        "second page item not in first page",
        firstPageIds.includes(id),
        false,
      );
    }
    // 6. Verify sort order is maintained (created_at DESC)
    for (let i = 0; i < secondPage.data.length - 1; i++) {
      const current = new Date(secondPage.data[i].created_at).getTime();
      const next = new Date(secondPage.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "created_at descending order in second page",
        current >= next,
      );
    }
    // Verify second page pagination metadata
    TestValidator.equals(
      "second page pagination pages",
      secondPage.pagination.pages > 0,
      true,
    );
  } else {
    // If only one page, verify we got all items
    TestValidator.equals(
      "single page contains all records",
      firstPage.pagination.records,
      firstPage.data.length,
    );
  }
  // 7. Verify overall sort order across pages
  if (firstPage.data.length > 1) {
    for (let i = 0; i < firstPage.data.length - 1; i++) {
      const current = new Date(firstPage.data[i].created_at).getTime();
      const next = new Date(firstPage.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        "created_at descending order in first page",
        current >= next,
      );
    }
  }
}
