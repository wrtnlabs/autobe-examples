import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator filtering guest accounts by date range and including soft-deleted records.
 *
 * Validates advanced filtering capabilities for security audit and analytics purposes.
 * Tests date range filtering, soft-delete inclusion, combined filters, and custom sorting.
 */
export async function test_api_guest_filtering_date_range_and_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Step 2: Test date range filtering
  const dateRangeResult = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        createdAtFrom: "2026-03-01T00:00:00Z",
        createdAtTo: "2026-03-16T23:59:59Z",
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(dateRangeResult);
  // Step 3: Test includeDeleted filtering
  const deletedResult = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        includeDeleted: true,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(deletedResult);
  // Step 4: Test combined filters with sorting
  const combinedResult = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        createdAtFrom: "2026-03-01T00:00:00Z",
        createdAtTo: "2026-03-16T23:59:59Z",
        includeDeleted: true,
        orderBy: "updated_at",
        orderByDirection: "asc",
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(combinedResult);
  // Step 5: Verify sorting by updated_at ascending
  if (combinedResult.data.length > 1) {
    for (let i = 1; i < combinedResult.data.length; i++) {
      const prev = combinedResult.data[i - 1];
      const curr = combinedResult.data[i];
      TestValidator.predicate(
        "guests sorted by updated_at ascending",
        new Date(prev.updatedAt).getTime() <=
          new Date(curr.updatedAt).getTime(),
      );
    }
  }
}
