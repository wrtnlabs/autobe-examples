import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentStatus";

export async function test_api_payment_status_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin and obtain token (admin context automatically applied)
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Try retrieving payment status event with random IDs that probably do not exist
  await TestValidator.error(
    "admin retrieving status with random IDs should fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.statuses.at(connection, {
        paymentId: typia.random<string & tags.Format<"uuid">>(),
        statusId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 3. Simulate a successful retrieval in mock environment, validate fields
  if (connection.simulate) {
    // Simulator always returns valid objects—even for random UUIDs
    const paymentStatus: IShoppingMallPaymentStatus =
      await api.functional.shoppingMall.admin.payments.statuses.at(connection, {
        paymentId: typia.random<string & tags.Format<"uuid">>(),
        statusId: typia.random<string & tags.Format<"uuid">>(),
      });
    typia.assert(paymentStatus);
    TestValidator.predicate(
      "payment status event fields must include all details",
      paymentStatus.payment_id !== undefined &&
        typeof paymentStatus.old_status === "string" &&
        typeof paymentStatus.new_status === "string" &&
        typeof paymentStatus.changed_reason === "string" &&
        typeof paymentStatus.changed_at === "string" &&
        (paymentStatus.changed_by_admin_id === null ||
          typeof paymentStatus.changed_by_admin_id === "string"),
    );
  }

  // 4. Confirm that unauthenticated requests are denied
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "access is denied when unauthenticated",
    async () => {
      await api.functional.shoppingMall.admin.payments.statuses.at(unauthConn, {
        paymentId: typia.random<string & tags.Format<"uuid">>(),
        statusId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. PaymentId and statusId do not match (fake link), should fail with error
  await TestValidator.error(
    "mismatched statusId for a paymentId must fail",
    async () => {
      await api.functional.shoppingMall.admin.payments.statuses.at(connection, {
        paymentId: typia.random<string & tags.Format<"uuid">>(),
        statusId: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );
}
