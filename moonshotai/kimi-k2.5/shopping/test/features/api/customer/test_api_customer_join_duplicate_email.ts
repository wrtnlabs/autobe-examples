import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email for testing duplicate constraint
  const email = typia.random<string & tags.Format<"email">>();
  // First connection for initial successful registration
  const firstConnection: api.IConnection = { host: connection.host };
  // First registration should succeed
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(firstCustomer);
  // Second connection for duplicate registration attempt
  const secondConnection: api.IConnection = { host: connection.host };
  // Attempt to register with same email should return 409 Conflict
  await TestValidator.httpError(
    "duplicate email registration should return 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.auth.customer.join(secondConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
        } satisfies IEcommerceMallCustomer.IJoin,
      });
    },
  );
}
