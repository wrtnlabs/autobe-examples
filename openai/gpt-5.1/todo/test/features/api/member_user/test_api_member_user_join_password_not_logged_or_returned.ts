import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppMemberUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUser";
import type { ITodoAppMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppMemberUserJoin";

export async function test_api_member_user_join_password_not_logged_or_returned(
  connection: api.IConnection,
) {
  // 1. Prepare a recognizable password and join payload
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> =
    "P@ssw0rd-NEVER-RETURN-THIS" as string & tags.Format<"password">;

  const body = {
    email,
    password,
    displayName: RandomGenerator.name(),
    href: "https://todoapp.example.com/signup",
    referrer: "https://todoapp.example.com/landing",
  } satisfies ITodoAppMemberUserJoin.ICreate;

  // 2. Call the join endpoint
  const authorized: ITodoAppMemberUser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, { body });

  // 3. Type-level assertion of response
  typia.assert<ITodoAppMemberUser.IAuthorized>(authorized);

  // 4. Validate that no password or password_hash fields are present anywhere
  const serialized = JSON.parse(JSON.stringify(authorized)) as Record<
    string,
    unknown
  >;

  const forbiddenKeys = ["password", "password_hash"] as const;

  const walk = (obj: unknown, path: string[]): void => {
    if (obj === null || obj === undefined) return;
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i += 1)
        walk(obj[i], path.concat(String(i)));
      return;
    }
    if (typeof obj === "object") {
      const record = obj as Record<string, unknown>;
      for (const [key, value] of Object.entries(record)) {
        if (forbiddenKeys.includes(key as (typeof forbiddenKeys)[number])) {
          throw new Error(
            `Forbidden key '${key}' found in authorized payload at '${path.concat(key).join(".")}'`,
          );
        }
        walk(value, path.concat(key));
      }
    }
  };

  walk(serialized, []);

  // 5. Ensure that token object exists and only contains allowed credential fields
  TestValidator.predicate(
    "token object should exist",
    () => authorized.token !== null && authorized.token !== undefined,
  );

  typia.assert<IAuthorizationToken>(authorized.token);

  TestValidator.predicate(
    "access token is non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
}
