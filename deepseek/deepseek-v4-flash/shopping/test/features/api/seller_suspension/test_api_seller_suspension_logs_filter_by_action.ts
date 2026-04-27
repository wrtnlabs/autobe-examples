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

export async function test_api_seller_suspension_logs_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Promote to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  // 3. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 4. Suspend the seller
  const suspendResult =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspend(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: "Low performance metrics",
        } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendResult);
  // 5. Unsuspend the seller
  const unsuspendResult =
    await api.functional.eCommerceMall.superAdministrator.sellers.unsuspend(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: "Performance improved",
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspendResult);
  // 6. Query suspension logs with action='suspend' filter
  const page =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspension_logs.index(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          action: "suspend",
          page: 1,
          limit: 10,
        } satisfies IECommerceMallSellerSuspensionLog.IRequest,
      },
    );
  typia.assert(page);
  // 7. Verify only suspend records returned — filter by action='suspend' must exclude unsuspend
  TestValidator.equals("records count", page.data.length, 1);
  const record = page.data[0]!;
  TestValidator.equals("action type", record.action, "suspend");
  TestValidator.equals("reason", record.reason, "Low performance metrics");
  TestValidator.equals("actor type", record.actor_type, "super_administrator");
  TestValidator.equals("pagination records", page.pagination.records, 1);
  TestValidator.equals("pagination pages", page.pagination.pages, 1);
  TestValidator.equals("pagination current", page.pagination.current, 1);
}
