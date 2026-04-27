import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
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

export async function test_api_seller_unsuspend_by_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Promote the administrator to super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        administrator_id: adminAuthorized.id,
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuthorized);
  // 3. Register a new seller (store password for later login verification)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuthorized);
  // 4. Using administrator authority, suspend the seller
  const suspendResult =
    await api.functional.eCommerceMall.administrator.sellers.suspend(
      adminConnection,
      {
        sellerId: sellerAuthorized.id,
        body: {
          reason: "Violation of platform policies",
        } satisfies IECommerceMallSeller.ISuspend,
      },
    );
  typia.assert(suspendResult);
  // 5. Using super administrator authority, unsuspend the seller
  const unsuspendResult =
    await api.functional.eCommerceMall.superAdministrator.sellers.unsuspend(
      superAdminConnection,
      {
        sellerId: sellerAuthorized.id,
        body: {
          reason: "Issue resolved - seller has addressed the policy violation",
        } satisfies IECommerceMallSeller.IUnsuspend,
      },
    );
  typia.assert(unsuspendResult);
  // 6. Validate the unsuspend response
  TestValidator.equals(
    "seller id matches",
    unsuspendResult.id,
    sellerAuthorized.id,
  );
  TestValidator.equals(
    "seller email matches",
    unsuspendResult.email,
    sellerAuthorized.email,
  );
  TestValidator.equals(
    "approval status is approved",
    unsuspendResult.approval_status,
    "approved",
  );
  TestValidator.predicate(
    "seller profile is present",
    unsuspendResult.profile !== null,
  );
  if (unsuspendResult.profile !== null) {
    TestValidator.predicate(
      "shop name is present",
      unsuspendResult.profile.shopName.length > 0,
    );
  }
  // 7. Verify seller can log in after unsuspension
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  const sellerLoginResult = await authorize_seller_login(
    sellerLoginConnection,
    {
      body: {
        email: sellerAuthorized.email,
        password: sellerPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IECommerceMallSeller.ILogin,
    },
  );
  typia.assert(sellerLoginResult);
  TestValidator.equals(
    "seller approval status is approved after login",
    sellerLoginResult.approval_status,
    "approved",
  );
}
