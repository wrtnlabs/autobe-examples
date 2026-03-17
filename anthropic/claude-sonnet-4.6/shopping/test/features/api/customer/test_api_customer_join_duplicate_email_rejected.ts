import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_duplicate_email_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first customer with a unique email
  const sharedEmail = typia.random<string & tags.Format<"email">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAuthorized = await authorize_customer_join(firstConnection, {
    body: {
      email: sharedEmail,
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstAuthorized);
  // Step 2: Attempt to register a second customer using the exact same email
  // This should fail with a conflict error (duplicate email)
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration rejected",
    async () => {
      await api.functional.shoppingMall.auth.customer.join(
        duplicateConnection,
        {
          body: {
            email: sharedEmail,
            password: RandomGenerator.alphaNumeric(16),
            nickname: RandomGenerator.name(1),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
          } satisfies IShoppingMallCustomer.IJoin,
        },
      );
    },
  );
  // Step 3: Verify the first customer's data remains intact and valid
  TestValidator.equals(
    "first customer email unchanged",
    firstAuthorized.email,
    sharedEmail,
  );
  // Step 4: Confirm that a third registration with a NEW unique email succeeds,
  // proving the rejection was scoped to the duplicate email only
  const thirdConnection: api.IConnection = { host: connection.host };
  const thirdAuthorized = await authorize_customer_join(thirdConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(thirdAuthorized);
  TestValidator.notEquals(
    "third customer has different id from first",
    firstAuthorized.id,
    thirdAuthorized.id,
  );
}
