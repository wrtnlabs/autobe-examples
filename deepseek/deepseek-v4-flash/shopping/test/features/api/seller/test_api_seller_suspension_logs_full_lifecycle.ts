import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerSuspensionLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_suspension_logs_full_lifecycle(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IECommerceMallAdministrator.IJoin;
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  typia.assert(adminAuth);
  // 2. Promote administrator to superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminAuth.id,
      },
    },
  );
  typia.assert(superAdminAuth);
  // 3. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinBody,
  });
  typia.assert(sellerAuth);
  // 4. Suspend the seller with reason
  const suspendBody = {
    reason: "Policy violation review",
  } satisfies IECommerceMallSeller.ISuspend;
  const suspendedSeller =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspend(
      superAdminConnection,
      {
        sellerId: sellerAuth.id,
        body: suspendBody,
      },
    );
  typia.assert(suspendedSeller);
  // 5. Unsuspend the seller with reason
  const unsuspendBody = {
    reason: "Violation resolved",
  } satisfies IECommerceMallSeller.IUnsuspend;
  const unsuspendedSeller =
    await api.functional.eCommerceMall.superAdministrator.sellers.unsuspend(
      superAdminConnection,
      {
        sellerId: sellerAuth.id,
        body: unsuspendBody,
      },
    );
  typia.assert(unsuspendedSeller);
  // 6. Query suspension logs (no filters)
  const logs =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspension_logs.index(
      superAdminConnection,
      {
        sellerId: sellerAuth.id,
        body: {} satisfies IECommerceMallSellerSuspensionLog.IRequest,
      },
    );
  typia.assert(logs);
  // 7. Validate pagination metadata
  TestValidator.equals("pagination current page", logs.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    logs.pagination.limit > 0,
  );
  TestValidator.equals("pagination records count", logs.pagination.records, 2);
  TestValidator.equals("pagination total pages", logs.pagination.pages, 1);
  // 8. Validate log entries count
  TestValidator.equals("total log entries", logs.data.length, 2);
  // Verify ordering: newest first (unsuspend before suspend)
  TestValidator.equals(
    "first entry action is unsuspend",
    logs.data[0].action,
    "unsuspend",
  );
  TestValidator.equals(
    "first entry reason",
    logs.data[0].reason,
    "Violation resolved",
  );
  TestValidator.equals(
    "first entry actor type",
    logs.data[0].actor_type,
    "super_administrator",
  );
  TestValidator.equals(
    "second entry action is suspend",
    logs.data[1].action,
    "suspend",
  );
  TestValidator.equals(
    "second entry reason",
    logs.data[1].reason,
    "Policy violation review",
  );
  TestValidator.equals(
    "second entry actor type",
    logs.data[1].actor_type,
    "super_administrator",
  );
  // 9. Validate ordering: created_at descending (newest first)
  const firstDate = new Date(logs.data[0].created_at).getTime();
  const secondDate = new Date(logs.data[1].created_at).getTime();
  TestValidator.predicate(
    "first entry is newer than second",
    firstDate > secondDate,
  );
}
