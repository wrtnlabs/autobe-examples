import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_member_registration_with_weak_password(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Password shorter than 8 characters
  await TestValidator.error("weak password - too short", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await api.functional.redditClone.auth.member.join(testConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "weak12", // 6 characters - violates minimum 8
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  });
  // Test 2: Password without uppercase letters
  await TestValidator.error("weak password - no uppercase", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await api.functional.redditClone.auth.member.join(testConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "lowercase123", // no uppercase - violates complexity requirements
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  });
  // Test 3: Password without lowercase letters
  await TestValidator.error("weak password - no lowercase", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await api.functional.redditClone.auth.member.join(testConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "UPPERCASE123", // no lowercase - violates complexity requirements
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  });
  // Test 4: Password without numbers
  await TestValidator.error("weak password - no numbers", async () => {
    const testConnection: api.IConnection = { host: connection.host };
    await api.functional.redditClone.auth.member.join(testConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "NoNumbers", // no numbers - violates complexity requirements
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    });
  });
  // Test 5: Valid strong password should succeed
  const validConnection: api.IConnection = { host: connection.host };
  const output = await api.functional.redditClone.auth.member.join(
    validConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123!", // 12 characters with uppercase, lowercase, numbers, special char
        username: RandomGenerator.name(),
        displayName: null,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMember.IJoin,
    },
  );
  typia.assert(output);
  TestValidator.equals("username matches", output.username, output.username);
  TestValidator.predicate("has valid token", output.token.access.length > 0);
}
