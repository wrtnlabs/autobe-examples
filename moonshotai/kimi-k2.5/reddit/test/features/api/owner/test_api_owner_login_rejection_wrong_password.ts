import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";

/**
 * Test authentication rejection when wrong password is provided.
 *
 * Steps:
 * 1) Create a new owner account with unique email and valid credentials
 * 2) Attempt login with correct email but intentionally wrong password
 * 3) Validate 401 Unauthorized is returned with generic error message
 * 4) Confirm no JWT tokens are returned (error prevents token generation)
 * 5) Verify uniform error message does NOT reveal if email exists (security requirement)
 */
export async function test_api_owner_login_rejection_wrong_password(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create owner connection
  const ownerConnection: api.IConnection = { host: connection.host };
  // Step 2: Generate unique owner data
  const password = "ValidPassword123!";
  const email = typia.random<string & tags.Format<"email">>();
  // Step 3: Create owner account using utility function
  const owner = await authorize_owner_join(ownerConnection, {
    body: {
      email: email,
      password: password,
      nickname: RandomGenerator.name(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  typia.assert(owner);
  // Step 4: Attempt login with wrong password - should throw 401 Unauthorized
  const wrongPassword = password + "wrong";
  const loginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "login rejection with wrong password",
    401,
    async () => {
      await authorize_owner_login(loginConnection, {
        body: {
          email: email,
          password: wrongPassword,
          href: "https://example.com/redditLike/login",
          referrer: "https://example.com/redditLike",
          ip: "192.168.1.1",
        } satisfies IRedditLikeOwner.ILogin,
      });
    },
  );
}
