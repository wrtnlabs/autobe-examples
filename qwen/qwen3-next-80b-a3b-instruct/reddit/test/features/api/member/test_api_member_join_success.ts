import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_join_success(
  connection: api.IConnection,
) {
  const email: string = typia.random<string & tags.Format<"email">>();

  // Generate password with guaranteed complexity: 12+ chars with uppercase, lowercase, number, special char
  const lowercase = RandomGenerator.alphabets(1);
  const uppercase = RandomGenerator.alphabets(1).toUpperCase();
  const number = RandomGenerator.alphaNumeric(1).replace(/[a-zA-Z]/g, "");
  const special = "!@#$%^&*()_+-=[]{}|;:,.<>?".split("")[
    RandomGenerator.alphaNumeric(1).charCodeAt(0) % 28
  ];
  const remaining = RandomGenerator.alphaNumeric(8);
  let password = lowercase + uppercase + number + special + remaining;

  // Shuffle the password string to avoid predictable patterns
  password = password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");

  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com";
  const ip: string = "192.168.1.100";

  const output: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(output);

  TestValidator.equals(
    "registered member email matches input",
    output.email,
    email,
  );
  TestValidator.predicate(
    "access token is present and non-empty",
    () => output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is present and non-empty",
    () => output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    () => new Date(output.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token remains valid in future",
    () => new Date(output.token.refreshable_until) > new Date(),
  );
  TestValidator.predicate("member ID is a valid UUID", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
}
