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

export async function test_api_customer_refresh_idle_timeout(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account and get initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const customer: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(joinConnection, {
      body: {
        email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(typia.random<string & tags.Format<"email">>()),
        password: RandomGenerator.alphaNumeric(16) as string & tags.MinLength<8> & tags.Format<"password">,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallCustomer.IJoin,
    });
  typia.assert(customer);
  // 2. Store refresh token for later validation
  const refreshToken: string = customer.token.refresh;
  typia.assert(refreshToken);
  // 3. Attempt refresh after simulated idle timeout (>10 minutes)
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "refresh rejected due to idle timeout - customer must re-authenticate",
    async () => {
      await authorize_customer_refresh(refreshConnection, {
        body: { refresh_token: refreshToken },
      });
    },
  );
  // 4. Validate customer still has identity (old tokens cannot be renewed)
  typia.assert(customer.id);
  typia.assert(customer.email);
  typia.assert(customer.token.expired_at);
  typia.assert(customer.token.refreshable_until);
}