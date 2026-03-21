import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSellerSuspension";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_seller_suspension_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin to access suspension records endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Call PATCH /ecommerceMall/admin/seller-suspensions with pagination parameters (page=1, limit=10)
  const page1 =
    await api.functional.ecommerceMall.admin.seller_suspensions.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallSellerSuspension.IRequest,
      },
    );
  typia.assert(page1);
  // 3. Validate response contains pagination metadata (current, limit, records, pages)
  TestValidator.equals(
    "pagination exists",
    page1.pagination !== null && page1.pagination !== undefined,
    true,
  );
  TestValidator.equals("current page is 1", page1.pagination.current, 1);
  TestValidator.equals("limit is 10", page1.pagination.limit, 10);
  TestValidator.predicate(
    "records count exists",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate("pages count exists", page1.pagination.pages >= 0);
  // 4. Validate response data is array of suspension summaries
  TestValidator.equals("data is array", Array.isArray(page1.data), true);
  // 5. Validate each suspension record contains required fields
  for (const suspension of page1.data) {
    TestValidator.predicate(
      "id exists",
      suspension.id !== null && suspension.id !== undefined,
    );
    TestValidator.predicate(
      "reason exists",
      suspension.reason !== null && suspension.reason !== undefined,
    );
    TestValidator.predicate(
      "suspended_at exists",
      suspension.suspended_at !== null && suspension.suspended_at !== undefined,
    );
    TestValidator.predicate(
      "seller exists",
      suspension.seller !== null && suspension.seller !== undefined,
    );
    TestValidator.predicate(
      "suspendedBy exists",
      suspension.suspendedBy !== null && suspension.suspendedBy !== undefined,
    );
  }
  // 6. Validate results ordered by suspended_at descending (newest first)
  if (page1.data.length > 1) {
    for (let i = 0; i < page1.data.length - 1; i++) {
      const current = new Date(page1.data[i].suspended_at);
      const next = new Date(page1.data[i + 1].suspended_at);
      TestValidator.predicate(
        "suspended_at ordered descending",
        current.getTime() >= next.getTime(),
      );
    }
  }
  // 7. Verify pagination works by requesting page 2
  if (page1.pagination.pages > 1) {
    const page2 =
      await api.functional.ecommerceMall.admin.seller_suspensions.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IEcommerceMallSellerSuspension.IRequest,
        },
      );
    typia.assert(page2);
    TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
    // Verify page 1 and page 2 have different records
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1Ids = page1.data.map((s) => s.id);
      const page2Ids = page2.data.map((s) => s.id);
      const hasOverlap = page1Ids.some((id) => page2Ids.includes(id));
      TestValidator.equals(
        "page 1 and page 2 have no overlap",
        hasOverlap,
        false,
      );
    }
  }
}
