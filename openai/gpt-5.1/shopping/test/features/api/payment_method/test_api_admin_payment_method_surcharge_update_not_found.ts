import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodSurcharge } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurcharge";

/**
 * Validate not-found behavior when updating payment method surcharges.
 *
 * Business goal: Ensure that the admin surcharge update endpoint refuses to
 * update surcharges that do not exist under the given payment method, and that
 * it enforces the parent-child association between payment methods (by code)
 * and individual surcharge rows (by id).
 *
 * Covered flows:
 *
 * 1. Happy-path creation of an admin, payment method, and surcharge to establish
 *    valid context.
 * 2. Attempting to update a surcharge id that does not exist for a given
 *    paymentMethodCode, expecting an HTTP 404 style error.
 * 3. Attempting to update a surcharge id that exists but is associated with a
 *    different paymentMethodCode (mismatched parent), also expecting 404.
 *
 * Implementation outline:
 *
 * - Use POST /auth/admin/join to create and authenticate an admin. This will
 *   populate connection.headers.Authorization automatically; never touch
 *   connection.headers manually in the test.
 * - Use POST /shoppingMall/admin/paymentMethods to create one or two payment
 *   methods. Rely on typia.random<IShoppingMallPaymentMethod.ICreate>() for
 *   realistic method payloads, adjusting only fields necessary for test clarity
 *   (like code uniqueness if needed).
 * - Use POST /shoppingMall/admin/paymentMethods/{paymentMethodCode}/surcharges to
 *   create a baseline surcharge for each method using
 *   IShoppingMallPaymentMethodSurcharge.ICreate. Let typia.random drive most
 *   fields.
 * - For the first not-found case, construct a bogus surchargeId using
 *   typia.random<string & tags.Format<"uuid">>() that is guaranteed not to be
 *   the real surcharge.id, and call the PUT update endpoint for the valid
 *   payment method. Assert HttpError 404 via TestValidator.httpError.
 * - For the second not-found case, create two payment methods A and B. Create a
 *   surcharge under method A, then try to update that surcharge id using
 *   paymentMethodCode of method B. Again, assert HttpError 404.
 * - Use a minimal but valid IShoppingMallPaymentMethodSurcharge.IUpdate body
 *   (e.g., tweak fixed_fee_amount or percentage_fee_rate) to ensure the request
 *   is otherwise valid and the failure truly comes from not-found semantics,
 *   not payload issues.
 *
 * Assertions:
 *
 * - Typia.assert on all successful create/join responses to guarantee type
 *   correctness.
 * - TestValidator.httpError with expected status 404 for both invalid update
 *   attempts.
 */
export async function test_api_admin_payment_method_surcharge_update_not_found(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create base payment method A
  const methodABody = typia.random<IShoppingMallPaymentMethod.ICreate>();
  const methodA: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: methodABody,
    });
  typia.assert<IShoppingMallPaymentMethod>(methodA);

  // 3. Create a surcharge under payment method A
  const surchargeACreateBody =
    typia.random<IShoppingMallPaymentMethodSurcharge.ICreate>();
  const surchargeA: IShoppingMallPaymentMethodSurcharge =
    await api.functional.shoppingMall.admin.paymentMethods.surcharges.create(
      connection,
      {
        paymentMethodCode: methodA.code,
        body: surchargeACreateBody,
      },
    );
  typia.assert<IShoppingMallPaymentMethodSurcharge>(surchargeA);

  // 4. Attempt to update a non-existent surcharge id for method A
  const bogusSurchargeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const updateBodyNotFound1 = {
    fixed_fee_amount: 123.45,
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  await TestValidator.httpError(
    "updating non-existent surcharge id should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
        connection,
        {
          paymentMethodCode: methodA.code,
          surchargeId: bogusSurchargeId,
          body: updateBodyNotFound1,
        },
      );
    },
  );

  // 5. Create another payment method B
  const methodBBody = typia.random<IShoppingMallPaymentMethod.ICreate>();
  const methodB: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.admin.paymentMethods.create(connection, {
      body: methodBBody,
    });
  typia.assert<IShoppingMallPaymentMethod>(methodB);

  // 6. Attempt to update surchargeA using methodB.code (mismatched parent)
  const updateBodyNotFound2 = {
    percentage_fee_rate: 9.99,
  } satisfies IShoppingMallPaymentMethodSurcharge.IUpdate;

  await TestValidator.httpError(
    "updating surcharge with mismatched paymentMethodCode should return 404",
    404,
    async () => {
      await api.functional.shoppingMall.admin.paymentMethods.surcharges.update(
        connection,
        {
          paymentMethodCode: methodB.code,
          surchargeId: surchargeA.id,
          body: updateBodyNotFound2,
        },
      );
    },
  );
}
