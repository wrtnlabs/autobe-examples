import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_long_business_name(
  connection: api.IConnection,
) {
  // Generate a business name that exceeds the 255-character limit
  const longBusinessName = RandomGenerator.content({
    paragraphs: 5,
    sentenceMin: 20,
    sentenceMax: 30,
    wordMin: 8,
    wordMax: 15,
  }) as string;

  // Verify the generated name exceeds 255 characters
  TestValidator.predicate(
    "business name exceeds 255 characters",
    longBusinessName.length > 255,
  );

  // Ensure the business name is a string
  TestValidator.predicate(
    "business name is string",
    typeof longBusinessName === "string",
  );

  // Attempt to register seller with business name exceeding the limit
  await TestValidator.error(
    "seller registration should fail when business name exceeds 255 characters",
    async () => {
      await api.functional.shoppingMall.actors.sellers.create(connection, {
        body: longBusinessName,
      });
    },
  );
}
