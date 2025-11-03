import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";

/**
 * End-to-end verification of the seller password reset request update flow.
 *
 * This test performs the following sequence:
 *
 * 1. Register a new seller account
 * 2. Initiate a seller password reset request (request-reset)
 * 3. (Pretend to retrieve the resulting reset record as admin -- this simulates
 *    the database lookup step that would occur in actual implementation, since
 *    the password reset id is not returned to the user for security)
 * 4. Update the password reset request as the authenticated seller (extend
 *    expires_at)
 * 5. Mark the password reset request as consumed (set consumed_at)
 * 6. Attempt to update the reset request again after consumption (expect error)
 * 7. Attempt to update the reset request as unauthenticated actor (expect error)
 */
export async function test_api_seller_password_reset_update_by_seller(
  connection: api.IConnection,
) {
  // 1. Register seller
  const sellerBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;
  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody });
  typia.assert(seller);

  // 2. Initiate password reset request for seller (as if forgot password)
  const resetReq = {
    email: seller.email,
  } satisfies IShoppingSeller.IResetPasswordRequest;
  await api.functional.auth.seller.password.request_reset.requestPasswordReset(
    connection,
    { body: resetReq },
  );
  // --- Assume admin can see the latest reset entry for the seller ---
  // (In E2E test, simulate fetch by generating expected matching data)
  // Since we can't query the reset list, assume ID = typia.random<string & tags.Format<"uuid">>() for demonstration
  // In a real test, this would come from a secure system-controlled channel
  const passwordResetId = typia.random<string & tags.Format<"uuid">>();

  // 3. Update reset: extend expiry as seller
  const newExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const updateBody = {
    expires_at: newExpiresAt,
  } satisfies IShoppingPasswordReset.IUpdate;
  const updated = await api.functional.shopping.seller.passwordResets.update(
    connection,
    {
      passwordResetId,
      body: updateBody,
    },
  );
  typia.assert(updated);
  TestValidator.predicate(
    "updated expires_at should be >= now",
    new Date(updated.expires_at) >= new Date(),
  );
  TestValidator.equals("not consumed", updated.consumed_at, null);

  // 4. Mark reset as consumed as seller
  const consumedAt = new Date().toISOString();
  const consumeBody = {
    expires_at: updated.expires_at,
    consumed_at: consumedAt,
  } satisfies IShoppingPasswordReset.IUpdate;
  const consumed = await api.functional.shopping.seller.passwordResets.update(
    connection,
    {
      passwordResetId,
      body: consumeBody,
    },
  );
  typia.assert(consumed);
  TestValidator.equals(
    "consumed_at recorded",
    consumed.consumed_at,
    consumedAt,
  );

  // 5. Update after consumption: should fail
  await TestValidator.error(
    "cannot update password reset after consumption",
    async () => {
      await api.functional.shopping.seller.passwordResets.update(connection, {
        passwordResetId,
        body: {
          expires_at: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        } satisfies IShoppingPasswordReset.IUpdate,
      });
    },
  );

  // 6. Attempt update as unauthenticated (simulate new connection)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot update password reset",
    async () => {
      await api.functional.shopping.seller.passwordResets.update(unauthConn, {
        passwordResetId,
        body: {
          expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
        } satisfies IShoppingPasswordReset.IUpdate,
      });
    },
  );
}
