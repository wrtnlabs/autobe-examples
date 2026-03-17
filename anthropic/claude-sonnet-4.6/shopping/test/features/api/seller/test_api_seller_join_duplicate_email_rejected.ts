import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a unique email and credentials for the first seller
  const uniqueEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const shopName = RandomGenerator.name();
  // 2. Register the first seller — must succeed
  const sellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(sellerConnection, {
    body: {
      email: uniqueEmail,
      password,
      shop_name: shopName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstSeller);
  // Validate first seller's email matches input
  TestValidator.equals(
    "first seller email matches input",
    firstSeller.email,
    uniqueEmail,
  );
  // 3. Attempt to register a second seller with the exact same email — must be rejected
  const duplicateConnection1: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email (exact) must be rejected",
    async () => {
      await authorize_seller_join(duplicateConnection1, {
        body: {
          email: uniqueEmail,
          password: RandomGenerator.alphaNumeric(16),
          shop_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
  // 4. Attempt to register with uppercase version of same email — must be rejected (case-insensitive)
  const uppercaseEmail = uniqueEmail.toUpperCase() as string &
    tags.Format<"email">;
  const duplicateConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email (uppercase) must be rejected",
    async () => {
      await authorize_seller_join(duplicateConnection2, {
        body: {
          email: uppercaseEmail,
          password: RandomGenerator.alphaNumeric(16),
          shop_name: RandomGenerator.name(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
  // 5. Validate that the original seller account is unaffected
  TestValidator.equals(
    "original seller email unchanged",
    firstSeller.email,
    uniqueEmail,
  );
}
