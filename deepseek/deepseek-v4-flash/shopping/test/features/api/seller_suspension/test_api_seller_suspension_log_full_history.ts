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
 * Test that an administrator can view the complete suspension log history for a seller.
 *
 * Validates the full audit trail capture of administrative actions against a seller account, including both suspension and unsuspension events. Ensures that the suspension logs endpoint returns all recorded actions in chronological order (newest first), with correct action types, reasons, actor information, seller details, and pagination metadata.
 *
 * 1. Authenticate as an administrator via the join utility.
 * 2. Register a new seller via the seller join utility.
 * 3. Suspend the seller with a policy violation reason.
 * 4. Unsuspend the seller with a reinstatement reason.
 * 5. Query the suspension logs listing endpoint with no filters.
 * 6. Validate that both log entries are present, ordered correctly, and contain the expected data.
 */
export async function test_api_seller_suspension_log_full_history(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator setup
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
  const sellerId = seller.id;
  // 3. Suspend the seller
  const suspendReason = "Repeated policy violation — selling counterfeit goods";
  const suspended =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId,
        body: {
          reason: suspendReason,
        } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspended);
  // 4. Unsuspend the seller
  const unsuspendReason = "Seller has resolved compliance issues";
  const unsuspended =
    await api.functional.eCommerceMall.administrator.sellers.unsuspend(
      adminConnection,
      {
        sellerId,
        body: {
          reason: unsuspendReason,
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspended);
  // 5. List suspension logs with no filters
  const logs =
    await api.functional.eCommerceMall.administrator.sellers.suspension_logs.index(
      adminConnection,
      {
        sellerId,
        body: {} satisfies IECommerceMallSellerSuspensionLog.IRequest,
      },
    );
  typia.assert(logs);
  // 6. Validations
  // 6a. Pagination metadata: at least 2 records
  TestValidator.equals(
    "pagination records count >= 2",
    logs.pagination.records >= 2,
    true,
  );
  TestValidator.equals("pagination current", logs.pagination.current, 1);
  TestValidator.predicate("pagination limit > 0", logs.pagination.limit > 0);
  TestValidator.predicate("pagination pages >= 1", logs.pagination.pages >= 1);
  // 6b. Data array: exactly 2 log entries
  TestValidator.equals("log count", logs.data.length, 2);
  // 6c. First entry (newest) should be 'unsuspend', second should be 'suspend'
  const unsuspendLog = logs.data.find((log) => log.action === "unsuspend");
  const suspendLog = logs.data.find((log) => log.action === "suspend");
  // Ensure both entries exist
  TestValidator.predicate("unsuspend log exists", unsuspendLog !== undefined);
  TestValidator.predicate("suspend log exists", suspendLog !== undefined);
  // Order: newest first — unsuspend should come before suspend
  const unsuspendIndex = logs.data.indexOf(unsuspendLog!);
  const suspendIndex = logs.data.indexOf(suspendLog!);
  TestValidator.predicate(
    "unsuspend appears before suspend in list (newest first)",
    unsuspendIndex < suspendIndex,
  );
  // 6d. Validate unsuspend log details
  TestValidator.equals(
    "unsuspend log action",
    unsuspendLog!.action,
    "unsuspend",
  );
  TestValidator.equals(
    "unsuspend log reason",
    unsuspendLog!.reason,
    unsuspendReason,
  );
  TestValidator.equals(
    "unsuspend log actor_type",
    unsuspendLog!.actor_type,
    "administrator",
  );
  TestValidator.equals(
    "unsuspend log seller id",
    unsuspendLog!.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "unsuspend log seller email",
    unsuspendLog!.seller.email,
    seller.email,
  );
  TestValidator.predicate(
    "unsuspend log has valid created_at",
    !!unsuspendLog!.created_at,
  );
  // 6e. Validate suspend log details
  TestValidator.equals("suspend log action", suspendLog!.action, "suspend");
  TestValidator.equals("suspend log reason", suspendLog!.reason, suspendReason);
  TestValidator.equals(
    "suspend log actor_type",
    suspendLog!.actor_type,
    "administrator",
  );
  TestValidator.equals(
    "suspend log seller id",
    suspendLog!.seller.id,
    sellerId,
  );
  TestValidator.equals(
    "suspend log seller email",
    suspendLog!.seller.email,
    seller.email,
  );
  TestValidator.predicate(
    "suspend log has valid created_at",
    !!suspendLog!.created_at,
  );
}
