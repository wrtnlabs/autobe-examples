import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_seller_registration_invalid_email_format(
  connection: api.IConnection,
) {
  await TestValidator.error(
    "invalid email format should reject registration",
    async () => {
      await api.functional.shoppingMall.actors.sellers.create(connection, {
        body: "invalid-email",
      });
    },
  );
}
