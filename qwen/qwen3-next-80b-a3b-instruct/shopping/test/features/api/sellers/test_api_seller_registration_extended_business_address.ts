import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_extended_business_address(
  connection: api.IConnection,
) {
  // Generate the complete seller registration details as a JavaScript object
  const sellerDetails = {
    business_name: RandomGenerator.name(),
    business_address:
      "123 Main St, Apt 4B, Suite 100, New York, NY, United States",
    tax_id: typia.random<string & tags.Format<"uuid">>(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };

  // Convert the object to a JSON string as required by the API's IShoppingMallSeller.ICreate string type
  const sellerRegistrationPayload = JSON.stringify(sellerDetails);

  // Perform seller registration using the JSON string payload
  const response: IShoppingMallSeller.IRegistrationResponse =
    await api.functional.shoppingMall.actors.sellers.create(connection, {
      body: sellerRegistrationPayload,
    });

  // Verify successful registration response - response is a non-empty string per specification
  typia.assert(response);
  TestValidator.predicate(
    "registration response is a non-empty string",
    typeof response === "string" && response.length > 0,
  );
}
