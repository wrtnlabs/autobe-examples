import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethodSurcharge";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

/**
 * Validate idempotent and safe deletion of a payment method surcharge.
 *
 * Business context: An administrator configures payment methods and related
 * surcharge rules (fees) that affect checkout pricing. When cleaning up or
 * reconfiguring these surcharges, the admin might call the DELETE endpoint
 * multiple times for the same surcharge due to UI retries, race conditions, or
 * operator mistakes. The backend must handle repeat deletions safely: the
 * surcharge must be removed after the first successful deletion and remain
 * absent, while additional DELETE attempts must not recreate it or cause
 * unexpected server errors.
 *
 * End-to-end flow:
 *
 * 1. Admin joins the platform via POST /auth/admin/join.
 * 2. Admin creates a payment method via POST /shoppingMall/admin/paymentMethods.
 * 3. Admin creates a surcharge for that payment method via POST
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges.
 * 4. Admin lists surcharges via PATCH
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges and
 *    confirms the created surcharge id is present.
 * 5. Admin deletes the surcharge once via DELETE
 *    /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges/{surchargeId}.
 * 6. Admin lists surcharges again and confirms the surcharge id is absent.
 * 7. Admin calls the same DELETE endpoint a second time for the same ids and
 *    verifies that the call completes without throwing an unexpected error,
 *    representing idempotent or safe behavior.
 * 8. Admin lists surcharges once more and confirms the surcharge remains absent.
 *
 * Assertions:
 *
 * - All create and search responses are typia.assert-validated.
 * - Before deletion, the surcharge listing contains the created id.
 * - After first deletion, the surcharge listing no longer contains that id.
 * - Second deletion does not reintroduce the surcharge and does not cause
 *   unhandled errors in the test.
 */
export async function test_api_admin_delete_payment_method_surcharge_idempotent_behavior(
  connection: api.IConnection,
) {
  // 1. Admin joins (register new admin and establish Authorization header).
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a payment method as this admin.
  const paymentMethodCreateBody =
    typia.random<IShoppingMallPaymentMethod.ICreate>();
  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: paymentMethodCreateBody,
    });
  typia.assert(paymentMethod);

  const paymentMethodCode: string = paymentMethod.code;

  // 3. Create a surcharge for this payment method.
  const surchargeCreateBody =
    typia.random<IShoppingMallPaymentMethodSurcharge.ICreate>();
  const surcharge: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode,
        body: surchargeCreateBody,
      },
    );
  typia.assert(surcharge);

  const surchargeId: string & tags.Format<"uuid"> = surcharge.id;

  // Helper to list surcharges for this payment method with a simple request.
  const listSurcharges =
    async (): Promise<IPageIShoppingMallPaymentMethodSurcharge.ISummary> => {
      const page: IPageIShoppingMallPaymentMethodSurcharge.ISummary =
        await api.functional.shoppingMall.admin.paymentMethods.surcharges.index(
          connection,
          {
            paymentMethodCode,
            body: {
              page: 0 as number & tags.Type<"int32">,
              limit: 20 as number & tags.Type<"int32">,
            } satisfies IShoppingMallPaymentMethodSurcharge.IRequest,
          },
        );
      typia.assert(page);
      return page;
    };

  const hasSurchargeId = (
    page: IPageIShoppingMallPaymentMethodSurcharge.ISummary,
  ): boolean => page.data.some((summary) => summary.id === surchargeId);

  // 4. Verify surcharge is present before deletion.
  const pageBeforeDelete = await listSurcharges();
  TestValidator.predicate(
    "surcharge should exist before deletion",
    hasSurchargeId(pageBeforeDelete),
  );

  // 5. First DELETE call: should succeed and remove the surcharge.
  await api.functional.shoppingMall.admin.paymentMethods.surcharges.erase(
    connection,
    {
      paymentMethodCode,
      surchargeId,
    },
  );

  // 6. Confirm surcharge is absent after first deletion.
  const pageAfterFirstDelete = await listSurcharges();
  TestValidator.predicate(
    "surcharge should be absent after first deletion",
    !hasSurchargeId(pageAfterFirstDelete),
  );

  // 7. Second DELETE call: should complete without unexpected errors.
  // We do not assert status code; we only ensure the call does not re-create
  // the surcharge or crash the test harness.
  await api.functional.shoppingMall.admin.paymentMethods.surcharges.erase(
    connection,
    {
      paymentMethodCode,
      surchargeId,
    },
  );

  // 8. Confirm surcharge remains absent after second deletion.
  const pageAfterSecondDelete = await listSurcharges();
  TestValidator.predicate(
    "surcharge should remain absent after second deletion",
    !hasSurchargeId(pageAfterSecondDelete),
  );
}
