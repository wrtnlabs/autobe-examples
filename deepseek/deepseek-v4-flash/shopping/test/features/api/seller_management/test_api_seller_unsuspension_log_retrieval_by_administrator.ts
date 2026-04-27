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

export async function test_api_seller_unsuspension_log_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  const sellerId = sellerAuthorized.id;
  // 3. Administrator suspends the seller
  const suspendReason = "Suspension pending investigation";
  const suspendedSeller =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId,
        body: {
          reason: suspendReason,
        } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendedSeller);
  // 4. Administrator unsuspends the seller
  const unsuspendReason = "Investigation cleared - reinstating account";
  const unsuspendedSeller =
    await api.functional.eCommerceMall.administrator.sellers.unsuspend(
      adminConnection,
      {
        sellerId,
        body: {
          reason: unsuspendReason,
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspendedSeller);
  // 5. Test 404 when querying with a non-existent logId
  const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "valid seller, non-existent log ID",
    404,
    async () => {
      await api.functional.eCommerceMall.administrator.sellers.suspension_logs.at(
        adminConnection,
        {
          sellerId,
          logId: nonExistentLogId,
        },
      );
    },
  );
  // 6. Test 404 when querying with a non-matching sellerId
  const randomSellerId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError("non-matching seller ID", 404, async () => {
    await api.functional.eCommerceMall.administrator.sellers.suspension_logs.at(
      adminConnection,
      {
        sellerId: randomSellerId,
        logId: nonExistentLogId,
      },
    );
  });
}
