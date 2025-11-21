import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_special_characters_in_business_name(
  connection: api.IConnection,
) {
  // Define allowed special characters in business names as per scenario
  // Test with hyphens, ampersands, and parentheses as specified
  const businessNames = [
    "Tech-Solutions Inc.",
    "John & Jane's Coffee",
    "Innovate(PT) Ltd.",
    "Global-Trade & Co.",
    "Premium-Style Apparel",
  ];

  // For each business name with special characters, create a complete registration object as JSON string
  for (const businessName of businessNames) {
    // Create a JSON string payload as required by IShoppingMallSeller.ICreate (type string)
    // Must include all required fields according to DTO description
    const registrationData = {
      business_name: businessName,
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      business_address: RandomGenerator.paragraph({
        sentences: 3,
        wordMin: 5,
        wordMax: 10,
      }),
      tax_id: typia.random<string & tags.Pattern<"^[A-Z0-9]{9,15}$">>(),
    };

    // Convert the object to a JSON string as required by the ICreate type which is string
    const jsonString: string = JSON.stringify(registrationData);

    // Execute the API call passing the JSON string as body
    const registration: IShoppingMallSeller.IRegistrationResponse =
      await api.functional.shoppingMall.actors.sellers.create(connection, {
        body: jsonString,
      });

    // Validate the response type
    typia.assert(registration);
  }
}
