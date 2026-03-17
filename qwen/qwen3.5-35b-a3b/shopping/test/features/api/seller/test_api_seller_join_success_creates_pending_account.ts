import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_success_creates_pending_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new seller account with valid credentials
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinEmail = typia.random<string & tags.Format<"email">>();
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const joinHref = typia.random<string & tags.Format<"uri">>();
  const joinReferrer = typia.random<string & tags.Format<"uri">>();
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(joinResult);
  // 2. Validate response structure - identity fields
  TestValidator.equals("email matches input", joinResult.email, joinEmail);
  TestValidator.equals("id is present", joinResult.id !== undefined, true);
  TestValidator.equals(
    "created_at is present",
    joinResult.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is present",
    joinResult.updated_at !== undefined,
    true,
  );
  // 3. Validate JWT token structure
  TestValidator.predicate(
    "token.access is non-empty",
    joinResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty",
    joinResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is present",
    joinResult.token.expired_at !== undefined,
  );
  TestValidator.predicate(
    "refreshable_until is present",
    joinResult.token.refreshable_until !== undefined,
  );
  // 4. Test authentication with newly created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_seller_login(loginConnection, {
    body: {
      email: joinEmail,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(loginResult);
  // 5. Verify email uniqueness - duplicate registration should fail
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("duplicate email should fail", async () => {
    await authorize_seller_join(duplicateConnection, {
      body: {
        email: joinEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    });
  });
}
