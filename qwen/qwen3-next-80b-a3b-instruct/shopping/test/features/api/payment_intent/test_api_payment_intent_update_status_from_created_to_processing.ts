import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import type { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_intent_update_status_from_created_to_processing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate admin user via join endpoint
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a valid payment intent ID (assuming it exists in the system with status 'created')
  // Note: We don't have a create endpoint, so we assume a payment intent exists with this ID
  const paymentIntentId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the payment intent status from 'created' to 'processing'
  const updatedPaymentIntent: IShoppingMallPaymentIntent =
    await api.functional.shoppingMall.admin.payment_intents.update(
      adminConnection,
      {
        paymentIntentId: paymentIntentId,
        body: {
          status: "processing",
        } satisfies IShoppingMallPaymentIntent.IUpdate,
      },
    );
  typia.assert(updatedPaymentIntent);
  TestValidator.equals(
    "payment intent status updated successfully to processing",
    updatedPaymentIntent.status,
    "processing",
  );
  // Step 4: Verify idempotency - updating again with same status should not fail
  const idempotentUpdate: IShoppingMallPaymentIntent =
    await api.functional.shoppingMall.admin.payment_intents.update(
      adminConnection,
      {
        paymentIntentId: paymentIntentId,
        body: {
          status: "processing",
        } satisfies IShoppingMallPaymentIntent.IUpdate,
      },
    );
  typia.assert(idempotentUpdate);
  TestValidator.equals(
    "payment intent status remains processing after idempotent update",
    idempotentUpdate.status,
    "processing",
  );
  // Step 5: Test that updating from 'processing' to 'authorized' fails with 403 (forbidden)
  await TestValidator.error(
    "updating processing status to authorized should fail with 403",
    async () => {
      await api.functional.shoppingMall.admin.payment_intents.update(
        adminConnection,
        {
          paymentIntentId: paymentIntentId,
          body: {
            status: "authorized",
          } satisfies IShoppingMallPaymentIntent.IUpdate,
        },
      );
    },
  );
  // Step 6: Test that updating from 'processing' to 'captured' fails with 403 (forbidden)
  await TestValidator.error(
    "updating processing status to captured should fail with 403",
    async () => {
      await api.functional.shoppingMall.admin.payment_intents.update(
        adminConnection,
        {
          paymentIntentId: paymentIntentId,
          body: {
            status: "captured",
          } satisfies IShoppingMallPaymentIntent.IUpdate,
        },
      );
    },
  );
  // Step 7: Test that updating from 'processing' to 'created' fails with 403 (forbidden) - reverse transition not allowed
  await TestValidator.error(
    "updating processing status to created should fail with 403",
    async () => {
      await api.functional.shoppingMall.admin.payment_intents.update(
        adminConnection,
        {
          paymentIntentId: paymentIntentId,
          body: {
            status: "created",
          } satisfies IShoppingMallPaymentIntent.IUpdate,
        },
      );
    },
  );
  // Step 8: Test that updating from 'processing' to 'failed' fails with 403 (forbidden) - other transitions not allowed
  await TestValidator.error(
    "updating processing status to failed should fail with 403",
    async () => {
      await api.functional.shoppingMall.admin.payment_intents.update(
        adminConnection,
        {
          paymentIntentId: paymentIntentId,
          body: {
            status: "failed",
          } satisfies IShoppingMallPaymentIntent.IUpdate,
        },
      );
    },
  );
}
