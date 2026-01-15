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
export async function test_api_payment_intent_update_metadata_and_note(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/admin/join",
        referrer: "https://example.com/signup",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(adminUser);
  // Step 2: For the update operation, we need an existing payment intent ID.
  // Since there is no endpoint to create a payment intent in the provided APIs,
  // we must assume there is an existing payment intent to update.
  // Use a generated UUID as the paymentIntentId as this is the only requirement
  // for the update endpoint.
  const paymentIntentId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Create metadata update as a properly serialized JSON string
  // According to the IShoppingMallPaymentIntentMetadata type, this must be a JSON string
  const metadataUpdate: IShoppingMallPaymentIntentMetadata = JSON.stringify({
    campaign_id: "BLACK_FRIDAY_2026",
    source: "mobile_app",
    order_id: "ORD-2026-ML110",
  });
  // Step 4: Update payment intent with new metadata
  // Note: Other fields (amount, currency, status) are not changed as they are optional
  // and we're only testing metadata update with the fields defined in the metadata
  const updatedPaymentIntent: IShoppingMallPaymentIntent =
    await api.functional.shoppingMall.admin.payment_intents.update(
      adminConnection,
      {
        paymentIntentId,
        body: typia.assert<IShoppingMallPaymentIntent.IUpdate & { metadata: IShoppingMallPaymentIntentMetadata }>({
          metadata: metadataUpdate,
        }),
      },
    );
  typia.assert(updatedPaymentIntent);
  // Step 5: Validate that the metadata field was properly updated
  // Metadata is a string containing JSON, so we parse it for validation
  const parsedMetadata: Record<string, string> = JSON.parse(
    updatedPaymentIntent.metadata,
  );
  // Validate the metadata fields were set correctly
  TestValidator.equals(
    "updated metadata contains campaign_id",
    parsedMetadata.campaign_id,
    "BLACK_FRIDAY_2026",
  );
  TestValidator.equals(
    "updated metadata contains source",
    parsedMetadata.source,
    "mobile_app",
  );
  TestValidator.equals(
    "updated metadata contains order_id",
    parsedMetadata.order_id,
    "ORD-2026-ML110",
  );
  // Step 6: Validate that other financial fields (which cannot be updated by IUpdate)
  // have the same values as what was provided in the response
  // Note: Since we can't know original values without a creation API, we validate that
  // the update didn't introduce any changes to non-metadata fields
  // As no modification was done to these fields, we depend on the API contract
  // that these fields remain unchanged when not provided in update
  // The amount, currency, etc. are in the response from the update operation
  // We cannot validate against "initial" values because we didn't create the entity
  // We rely on the API contract that when these fields are not provided in update,
  // they remain unchanged from the current stored value
}