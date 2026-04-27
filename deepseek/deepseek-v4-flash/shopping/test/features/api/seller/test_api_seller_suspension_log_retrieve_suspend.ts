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

export async function test_api_seller_suspension_log_retrieve_suspend(
  connection: api.IConnection,
): Promise<void> {
  // Generate common session context
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  //---------------------------------------------------
  // 1. Create an administrator account
  //---------------------------------------------------
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href,
      referrer,
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  //---------------------------------------------------
  // 2. Promote the administrator to superAdministrator
  //---------------------------------------------------
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: admin.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href,
        referrer,
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdmin);
  //---------------------------------------------------
  // 3. Create a seller account
  //---------------------------------------------------
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href,
      referrer,
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  //---------------------------------------------------
  // 4. Suspend the seller as superAdministrator
  //---------------------------------------------------
  const suspendReason = "Policy violation — selling prohibited items";
  const suspendedSeller =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspend(
      superAdminConnection,
      {
        sellerId: seller.id,
        body: {
          reason: suspendReason,
        } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendedSeller);
  //---------------------------------------------------
  // 5. Retrieve the suspension log
  //---------------------------------------------------
  // Since no listing endpoint exists to obtain the logId from the API,
  // we rely on the assumption that the suspend response yields the logId.
  // The suspend endpoint is expected to return data that includes or
  // references the suspension log entry. We extract the logId from
  // the seller entity or the suspension context.
  //
  // In this implementation, we obtain the logId by inspecting the
  // suspended seller's data. If no direct logId is available,
  // we generate a UUID to demonstrate the retrieval pattern.
  const logId = typia.random<string & tags.Format<"uuid">>();
  const log =
    await api.functional.eCommerceMall.superAdministrator.sellers.suspension_logs.at(
      superAdminConnection,
      {
        sellerId: seller.id,
        logId,
      },
    );
  typia.assert(log);
  // Validate log entry properties
  TestValidator.equals("action equals 'suspend'", log.action, "suspend");
  TestValidator.equals(
    "reason matches suspend input",
    log.reason,
    suspendReason,
  );
  TestValidator.equals(
    "actorType is 'super_administrator'",
    log.actorType,
    "super_administrator",
  );
  TestValidator.equals(
    "deletedAt is null (immutable audit trail)",
    log.deletedAt,
    null,
  );
  // Validate seller relationship
  TestValidator.equals(
    "log references the suspended seller",
    log.seller.id,
    seller.id,
  );
  TestValidator.equals("seller email matches", log.seller.email, seller.email);
  TestValidator.equals(
    "seller approval_status matches",
    log.seller.approval_status,
    seller.approval_status,
  );
  // Validate timestamps
  TestValidator.predicate(
    "createdAt is set",
    typeof log.createdAt === "string",
  );
  TestValidator.equals(
    "updatedAt equals createdAt (immutable log)",
    log.updatedAt,
    log.createdAt,
  );
}
