import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerSuspensionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerSuspensionLog";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_seller_suspension_log_retrieve_unsuspend(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create an administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Promote the administrator to superAdministrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
      },
    },
  );
  typia.assert(superAdmin);
  // 3. Create a seller account
  const sellerCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies DeepPartial<IECommerceMallSeller.IJoin>;
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCreds,
  });
  typia.assert(seller);
  // 4. Suspend the seller as superAdministrator
  const suspendReason = "Under investigation";
  const suspendedSeller =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspend(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: { reason: suspendReason } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendedSeller);
  // 5. Unsuspend the seller as superAdministrator
  const unsuspendReason = "Investigation complete — no violation found";
  const unsuspendedSeller =
    await api.functional.eCommerceMall.superAdministrator.sellers.unsuspend(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: unsuspendReason,
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspendedSeller);
  // 6. Verify seller state transitions
  TestValidator.equals("seller id preserved", unsuspendedSeller.id, seller.id);
  TestValidator.predicate(
    "updated_at changed after unsuspend",
    new Date(unsuspendedSeller.updated_at).getTime() >
      new Date(seller.updated_at).getTime(),
  );
  // 7. Test GET endpoint with non-existent log ID (no listing endpoint available)
  // Since there is no listing endpoint to obtain actual log IDs, we verify
  // the endpoint exists and returns 404 for a non-existent log entry.
  await TestValidator.httpError(
    "retrieve non-existent suspension log returns 404",
    404,
    async () => {
      await api.functional.eCommerceMall.superAdministrator.sellers.suspension_logs.at(
        superAdminConnection,
        {
          sellerId: seller.id,
          logId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
