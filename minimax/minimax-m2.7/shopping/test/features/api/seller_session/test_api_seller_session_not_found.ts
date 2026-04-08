import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test retrieving a session with a non-existent sessionId returns 404 Not Found.
 *
 * This test validates:
 * 1. When an authenticated seller attempts to retrieve a session that does not exist,
 *    the system returns 404 Not Found.
 * 2. Proper error handling for invalid session identifiers.
 * 3. The session lookup query correctly filters out non-existent records.
 */
export async function test_api_seller_session_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account using utility function
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://example.com/register",
      referrer: "https://google.com",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 2. Login to get a valid authenticated session
  const loginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(loginConnection, {
    body: {
      email: authorized.email,
      password: "TestPassword123!",
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Generate a random non-existent UUID that doesn't exist in the database
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // 4. Attempt to retrieve the non-existent session and validate 404 error
  await TestValidator.httpError(
    "non-existent session returns 404 Not Found",
    404,
    async () =>
      await api.functional.ecommerceMall.seller.seller.sessions.at(
        loginConnection,
        {
          sessionId: nonExistentSessionId,
        },
      ),
  );
}
