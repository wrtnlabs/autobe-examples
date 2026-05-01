import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IPageIShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerPasswordReset";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordReset";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test retrieval of a specific seller password reset token by an administrator.
 *
 * Validates that an administrator can retrieve the full details of a password reset token record including the cryptographically random token value, expiration and creation timestamps, and the associated seller account summary with profile information.
 *
 * 1. Administrator authenticates via join (registration + immediate session creation).
 * 2. Administrator browses the seller listing to obtain a valid sellerId.
 * 3. Administrator lists password reset tokens for the selected seller to obtain a valid resetId.
 * 4. Administrator retrieves the specific password reset token by sellerId and resetId.
 * 5. Validates that the response contains all required fields: id, token, expired_at, created_at, updated_at, and the nested seller summary with profile details. Business logic checks confirm reset ID and seller identity match the requested resources, the token is non-empty, and timestamps are logically ordered.
 */
export async function test_api_admin_seller_password_reset_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin@wrtn.io",
      password: "test-password",
    },
  });
  // 2. Browse sellers to obtain a valid sellerId
  const sellers = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    { body: {} satisfies IShoppingMallSeller.IRequest },
  );
  typia.assert(sellers);
  TestValidator.predicate("sellers exist", sellers.data.length > 0);
  const seller = sellers.data[0];
  // 3. List password reset tokens for the selected seller
  const passwordResets =
    await api.functional.shoppingMall.admin.sellers.password_resets.index(
      adminConnection,
      {
        sellerId: seller.id,
        body: {} satisfies IShoppingMallSellerPasswordReset.IRequest,
      },
    );
  typia.assert(passwordResets);
  TestValidator.predicate(
    "password resets exist",
    passwordResets.data.length > 0,
  );
  const resetSummary = passwordResets.data[0];
  // 4. Retrieve the specific password reset token
  const passwordReset =
    await api.functional.shoppingMall.admin.sellers.password_resets.at(
      adminConnection,
      { sellerId: seller.id, resetId: resetSummary.id },
    );
  typia.assert(passwordReset);
  // 5. Validate business logic
  TestValidator.equals(
    "reset id matches request",
    passwordReset.id,
    resetSummary.id,
  );
  TestValidator.equals("seller id matches", passwordReset.seller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    passwordReset.seller.email,
    seller.email,
  );
  TestValidator.predicate("token is non-empty", passwordReset.token.length > 0);
  TestValidator.predicate(
    "expired_at after created_at",
    new Date(passwordReset.expired_at).getTime() >
      new Date(passwordReset.created_at).getTime(),
  );
  TestValidator.predicate(
    "updated_at not before created_at",
    new Date(passwordReset.updated_at).getTime() >=
      new Date(passwordReset.created_at).getTime(),
  );
}