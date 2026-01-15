import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentCryptocurrencyConversion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentCryptocurrencyConversion";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_cryptocurrency_conversion_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate by joining
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a valid conversion ID for an existing record
  // Since the API doesn't provide a creation endpoint, we must use a pre-existing one
  // We choose a valid UUID format as the ID, assuming an existing conversion record
  const conversionId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the conversion record with valid data
  const updatedConversion: IShoppingMallPaymentCryptocurrencyConversion =
    await api.functional.shoppingMall.admin.payment_cryptocurrency_conversions.update(
      adminConnection,
      {
        conversionId: conversionId,
        body: {
          from_currency: "USD",
          to_currency: "BTC",
          conversion_rate: 0.000024,
          source_amount: 100.5,
          target_amount: 0.002412,
          source_confidence: 0.95,
        } satisfies IShoppingMallPaymentCryptocurrencyConversion.IUpdate,
      },
    );
  typia.assert(updatedConversion);
  // Step 4: Validate that the update was successful
  // Verify the response adheres to the IShoppingMallPaymentCryptocurrencyConversion schema
  TestValidator.equals(
    "from_currency matches",
    updatedConversion.from_currency,
    "USD",
  );
  TestValidator.equals(
    "to_currency matches",
    updatedConversion.to_currency,
    "BTC",
  );
  TestValidator.equals(
    "conversion_rate updated",
    updatedConversion.conversion_rate,
    0.000024,
  );
  TestValidator.equals(
    "source_amount matches",
    updatedConversion.source_amount,
    100.5,
  );
  TestValidator.equals(
    "target_amount updated",
    updatedConversion.target_amount,
    0.002412,
  );
  TestValidator.equals(
    "source_confidence unchanged",
    updatedConversion.source_confidence,
    0.95,
  );
  TestValidator.equals("fee_amount matches", updatedConversion.fee_amount, 0); // May be set to default by server
  TestValidator.equals("status is valid", updatedConversion.status, "pending"); // Assume server sets status to pending after update
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      updatedConversion.id,
    ),
  );
  TestValidator.predicate(
    "transaction_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      updatedConversion.transaction_id,
    ),
  );
  TestValidator.predicate(
    "customer_id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      updatedConversion.customer_id,
    ),
  );
  // Since the schema does not include updated_at, we do not validate it
  // Validate created_at is present and has correct format (since it should be unchanged)
  TestValidator.predicate(
    "created_at is a valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      updatedConversion.created_at,
    ),
  );
}
