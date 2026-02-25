import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMultiUserTodoUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IMultiUserTodoUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_registration_join_and_email_duplication(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful user registration
  const userConnection1: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(10);
  const displayName = RandomGenerator.name();
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  const ip = undefined;
  const joinBody1 = {
    email,
    password,
    displayName,
    href,
    referrer,
    ip,
  } satisfies IMultiUserTodoUser.IJoin;
  const authorized1 = await authorize_user_join(userConnection1, {
    body: joinBody1,
  });
  typia.assert(authorized1);
  // Validate authorized1 properties
  TestValidator.predicate("authorized1.id is a valid uuid", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorized1.id,
    ),
  );
  TestValidator.equals(
    "authorized1.displayName equals input displayName",
    authorized1.displayName,
    displayName,
  );
  // Validate tokens
  const token = authorized1.token;
  typia.assert(token);
  TestValidator.predicate(
    "token.access is a non-empty string",
    token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is a non-empty string",
    token.refresh.length > 0,
  );
  TestValidator.predicate("token.expired_at is ISO date-time string", () =>
    /^2\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\u00022$/.test(
      token.expired_at,
    ),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO date-time string",
    () =>
      /^2\d{3}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\u00022$/.test(
        token.refreshable_until,
      ),
  );
  // Scenario 2: Duplicate email registration
  const userConnection2: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_user_join(userConnection2, { body: joinBody1 });
    },
  );
}
