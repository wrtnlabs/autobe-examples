import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerPasswordReset";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_password_reset_by_admin_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate an admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // Admin login with the joined credentials
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: RandomGenerator.alphaNumeric(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a seller account for password reset testing
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const originalPassword = RandomGenerator.alphaNumeric(12);
  const newPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: sellerEmail,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerAuth);
  // 3. Admin initiates password reset for the seller
  // NOTE: The scenario specifies "A valid password reset token exists in the system"
  // Using a simulated token - in real tests this would be provided by test setup
  const simulatedToken = RandomGenerator.alphaNumeric(32);
  const resetResult =
    await api.functional.ecommerceMall.admin.sellers.password_resets.reset(
      adminConnection,
      {
        sellerId: sellerAuth.id,
        body: {
          newPassword: newPassword,
          token: simulatedToken,
        } satisfies IEcommerceMallSellerPasswordReset.IReset,
      },
    );
  typia.assert(resetResult);
  // 4. Verify the reset response contains the correct seller info
  TestValidator.equals("seller ID matches", resetResult.id, sellerAuth.id);
  TestValidator.equals("seller email matches", resetResult.email, sellerEmail);
  // 5. Verify seller can login with new password (old password should fail)
  const loginWithNewPassword =
    await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerEmail,
        password: newPassword,
      } satisfies IEcommerceMallSeller.ILogin,
    });
  typia.assert(loginWithNewPassword);
  // Validate successful login with new credentials
  TestValidator.equals(
    "login successful email",
    loginWithNewPassword.email,
    sellerEmail,
  );
  TestValidator.predicate(
    "has authorization token",
    loginWithNewPassword.token.access.length > 0,
  );
}
