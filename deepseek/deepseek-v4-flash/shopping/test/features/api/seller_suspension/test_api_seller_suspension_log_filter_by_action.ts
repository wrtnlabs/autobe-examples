import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
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

/**
 * Test that administrator can filter seller suspension logs by action type.
 *
 * Validates the suspension log filtering functionality by creating both 'suspend' and 'unsuspend' log entries for a seller, then querying only 'suspend' entries. Ensures that unsuspend entries do not leak through the filter, and each returned entry has correct properties including action type, reason, actor type, seller summary, and pagination metadata.
 *
 * 1. Administrator joins the platform and authenticates.
 * 2. Seller joins the platform to obtain a seller account.
 * 3. Administrator suspends the seller with a reason, creating a 'suspend' log entry.
 * 4. Administrator unsuspends the seller with a reason, creating an 'unsuspend' log entry.
 * 5. Administrator queries suspension logs filtered by action='suspend'.
 * 6. Validates only suspend entries returned, each with correct action, reason, actor_type, seller summary, and pagination count.
 */
export async function test_api_seller_suspension_log_filter_by_action(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup
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
  // 2. Seller setup
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
  // 3. Suspend the seller
  const suspendReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspended =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: { reason: suspendReason } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspended);
  // 4. Unsuspend the seller
  const unsuspendReason = RandomGenerator.paragraph({ sentences: 2 });
  const unsuspended =
    await api.functional.eCommerceMall.administrator.sellers.unsuspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: unsuspendReason,
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspended);
  // 5. Query suspension logs filtered by action='suspend'
  const result =
    await api.functional.eCommerceMall.administrator.sellers.suspension_logs.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          action: "suspend",
        } satisfies IECommerceMallSellerSuspensionLog.IRequest,
      },
    );
  typia.assert(result);
  // 6. Verify
  TestValidator.equals("suspend log entries count", result.data.length, 1);
  TestValidator.predicate("all entries have action='suspend'", () =>
    result.data.every((log) => log.action === "suspend"),
  );
  TestValidator.predicate("all entries have correct suspend reason", () =>
    result.data.every((log) => log.reason === suspendReason),
  );
  TestValidator.predicate("all entries have actor_type='administrator'", () =>
    result.data.every((log) => log.actor_type === "administrator"),
  );
  TestValidator.predicate("all entries reference the correct seller", () =>
    result.data.every((log) => log.seller.id === seller.id),
  );
  TestValidator.predicate("no unsuspend entries in results", () =>
    result.data.every((log) => log.action !== "unsuspend"),
  );
  TestValidator.equals(
    "pagination records count matches suspend events",
    result.pagination.records,
    1,
  );
}
