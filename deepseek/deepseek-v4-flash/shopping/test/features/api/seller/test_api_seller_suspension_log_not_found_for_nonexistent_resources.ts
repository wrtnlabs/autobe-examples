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

export async function test_api_seller_suspension_log_not_found_for_nonexistent_resources(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // 2. Test Case A: Non-existent seller with non-existent log
  {
    const nonExistentSellerId = typia.random<string & tags.Format<"uuid">>();
    const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "non-existent seller and log returns 404",
      404,
      async () => {
        await api.functional.eCommerceMall.administrator.sellers.suspension_logs.at(
          adminConnection,
          {
            sellerId: nonExistentSellerId,
            logId: nonExistentLogId,
          },
        );
      },
    );
  }
  // 3. Setup: Register a seller for Test Case B
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
  // 4. Test Case B: Existent seller but non-existent log
  {
    const nonExistentLogId = typia.random<string & tags.Format<"uuid">>();
    await TestValidator.httpError(
      "existent seller but non-existent log returns 404",
      404,
      async () => {
        await api.functional.eCommerceMall.administrator.sellers.suspension_logs.at(
          adminConnection,
          {
            sellerId: seller.id,
            logId: nonExistentLogId,
          },
        );
      },
    );
  }
}
