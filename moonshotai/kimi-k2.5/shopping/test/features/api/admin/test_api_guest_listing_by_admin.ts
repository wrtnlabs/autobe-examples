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

export async function test_api_guest_listing_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      href: typia.random<string & tags.Format<"url">>(),
      referrer: typia.random<string & tags.Format<"url">>(),
    } satisfies Partial<IEcommerceMallAdmin.IJoin>,
  });
  // Test 1: Default pagination
  const defaultResponse = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {} satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(defaultResponse);
  // Test 2: Custom pagination with page 2 and limit 5
  const page2Response = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(page2Response);
  TestValidator.equals("page 2 current", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  // Test 3: Sorting by created_at descending
  const descResponse = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        orderBy: "created_at",
        orderByDirection: "desc",
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(descResponse);
  // Test 4: Sorting by created_at ascending
  const ascResponse = await api.functional.ecommerceMall.admin.guests.index(
    adminConnection,
    {
      body: {
        orderBy: "created_at",
        orderByDirection: "asc",
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    },
  );
  typia.assert(ascResponse);
  // Test 5: Date range filtering
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const dateRangeResponse =
    await api.functional.ecommerceMall.admin.guests.index(adminConnection, {
      body: {
        createdAtFrom: oneWeekAgo.toISOString(),
        createdAtTo: now.toISOString(),
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    });
  typia.assert(dateRangeResponse);
  // Test 6: Include deleted guests
  const includeDeletedResponse =
    await api.functional.ecommerceMall.admin.guests.index(adminConnection, {
      body: {
        includeDeleted: true,
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    });
  typia.assert(includeDeletedResponse);
  // Test 7: Sorting by updated_at
  const updatedAtResponse =
    await api.functional.ecommerceMall.admin.guests.index(adminConnection, {
      body: {
        orderBy: "updated_at",
        orderByDirection: "desc",
        limit: 10,
      } satisfies IEcommerceMallGuest.IRequest,
    });
  typia.assert(updatedAtResponse);
}
