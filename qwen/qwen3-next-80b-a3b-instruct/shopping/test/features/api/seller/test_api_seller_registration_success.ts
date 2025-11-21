import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_success(
  connection: api.IConnection,
) {
  // According to the schema, IShoppingMallSeller.ICreate is defined as type string
  // and IShoppingMallSeller.IRegistrationResponse is defined as type string
  // We must respect these type definitions exactly as provided

  // Since ICreate is a string type, we need to construct a valid string representation
  // Per the documentation, this should be a JSON string containing the seller registration data
  const email = typia.random<string & tags.Format<"email">>();
  const businessName = RandomGenerator.name();
  const businessAddress = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const taxId = typia.random<string & tags.Pattern<"^[A-Z]{2}-[0-9]{9}$">>(); // Example format
  const password = RandomGenerator.alphaNumeric(12);

  // Construct a JSON string representation of the seller registration data
  const sellerData = JSON.stringify({
    email,
    businessName,
    businessAddress,
    taxId,
    password,
  });

  // Make the registration request with the string data
  const result: IShoppingMallSeller.IRegistrationResponse =
    await api.functional.shoppingMall.actors.sellers.create(connection, {
      body: sellerData satisfies IShoppingMallSeller.ICreate,
    });

  // Validate the response - since IRegistrationResponse is a string,
  // we expect a JSON string representation of the response data
  typia.assert(result);

  // Parse the response string to validate its structure
  const responseData = JSON.parse(result);

  // Verify the response has the expected structure: id and status properties
  TestValidator.predicate(
    "response is a valid object",
    typeof responseData === "object" && responseData !== null,
  );
  TestValidator.predicate(
    "response has id property",
    typeof responseData.id === "string",
  );
  TestValidator.predicate(
    "response has status property",
    typeof responseData.status === "string",
  );
  TestValidator.equals(
    "status should be pending_verification",
    responseData.status,
    "pending_verification",
  );
  TestValidator.predicate(
    "seller ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      responseData.id,
    ),
  );
}
