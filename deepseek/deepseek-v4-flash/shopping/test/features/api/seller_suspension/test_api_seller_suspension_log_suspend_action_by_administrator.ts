import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_seller_suspension_log_suspend_action_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup administrator
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
  // 2. Setup seller
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
  // 3. Administrator suspends the seller
  const suspendReason = "Policy violation: prohibited items";
  const suspendedSeller =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: suspendReason,
        } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendedSeller);
  // 4. Retrieve the suspension log entry
  const logId = typia.random<string & tags.Format<"uuid">>();
  const log =
    await api.functional.eCommerceMall.administrator.sellers.suspension_logs.at(
      adminConnection,
      {
        sellerId: seller.id,
        logId,
      },
    );
  typia.assert(log);
  // 5. Validate log entry fields
  TestValidator.equals("action is suspend", log.action, "suspend");
  TestValidator.equals("reason matches", log.reason, suspendReason);
  TestValidator.equals(
    "actor type is administrator",
    log.actorType,
    "administrator",
  );
  TestValidator.equals("deletedAt is null", log.deletedAt, null);
  TestValidator.predicate(
    "createdAt is valid ISO date",
    () => !isNaN(Date.parse(log.createdAt)),
  );
  TestValidator.predicate(
    "updatedAt is valid ISO date",
    () => !isNaN(Date.parse(log.updatedAt)),
  );
  TestValidator.equals("seller id matches", log.seller.id, seller.id);
}
