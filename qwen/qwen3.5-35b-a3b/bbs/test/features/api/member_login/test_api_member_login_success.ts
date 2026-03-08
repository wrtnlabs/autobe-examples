import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicPoliticalBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicPoliticalBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account via /economicPoliticalBoard/auth/member/join
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEconomicPoliticalBoardMember.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Login with the created credentials using the same email/password
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinResult.id satisfies string as string,
    password: "dummy",
  } satisfies IEconomicPoliticalBoardMember.ILogin;
  // Use the credentials from join to login
  const loginResult = await authorize_member_login(loginConnection, {
    body: {
      email: joinResult.id satisfies string as string,
      password: "dummy",
    } satisfies IEconomicPoliticalBoardMember.ILogin,
  });
  typia.assert(loginResult);
  // Step 3: Validate the response
  TestValidator.equals(
    "user id matches created user",
    loginResult.id,
    joinResult.id,
  );
  TestValidator.predicate(
    "access token is present",
    () => loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present",
    () => loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    () => new Date(loginResult.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable until is in future",
    () => new Date(loginResult.token.refreshable_until) > new Date(),
  );
}