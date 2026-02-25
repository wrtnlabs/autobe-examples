import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_customer_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Test email verification with expired token
  const actorConnection: api.IConnection = { host: connection.host };
  // Attempt to verify with an expired/fake token
  const expiredToken = "expired-token-12345";
  await TestValidator.error(
    "expired verification token should throw error",
    async () => {
      await api.functional.shoppingMall.email_verifications.verify(
        actorConnection,
        {
          token: expiredToken,
        },
      );
    },
  );
}
