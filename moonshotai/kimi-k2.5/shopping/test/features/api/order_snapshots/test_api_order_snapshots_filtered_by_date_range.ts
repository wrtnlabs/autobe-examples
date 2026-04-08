import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_snapshots_filtered_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Generate a random orderId
  const orderId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Filter with last 30 days date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const requestBody1 = {
    createdAtFrom: thirtyDaysAgo.toISOString(),
    createdAtTo: now.toISOString(),
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceMallOrderSnapshot.IRequest;
  const response1 =
    await api.functional.ecommerceMall.admin.orders.snapshots.index(
      adminConnection,
      {
        orderId,
        body: requestBody1,
      },
    );
  typia.assert(response1);
  // Test 2: Filter with narrow date range (last 7 days)
  const requestBody2 = {
    createdAtFrom: sevenDaysAgo.toISOString(),
    createdAtTo: now.toISOString(),
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceMallOrderSnapshot.IRequest;
  const response2 =
    await api.functional.ecommerceMall.admin.orders.snapshots.index(
      adminConnection,
      {
        orderId,
        body: requestBody2,
      },
    );
  typia.assert(response2);
  // Test 3: Future date range (likely empty results)
  const futureDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const furtherFuture = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const requestBody3 = {
    createdAtFrom: futureDate.toISOString(),
    createdAtTo: furtherFuture.toISOString(),
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IEcommerceMallOrderSnapshot.IRequest;
  const response3 =
    await api.functional.ecommerceMall.admin.orders.snapshots.index(
      adminConnection,
      {
        orderId,
        body: requestBody3,
      },
    );
  typia.assert(response3);
}
