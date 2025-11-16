import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_join_password_too_short(
  connection: api.IConnection,
) {
  // Test member registration with a password shorter than the minimum 12 characters
  // This should return HTTP 400 Bad Request according to business rules

  // Generate a valid email address
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // Generate invalid password: 11 characters (one character short of minimum 12)
  const invalidPassword = ArrayUtil.repeat(11, () =>
    RandomGenerator.alphabets(1),
  ).join("");

  // Generate valid URI values for href and referrer
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  // Generate valid IPv4 address
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();

  // Create the request body with invalid password
  const requestBody = {
    email,
    password: invalidPassword,
    href,
    referrer,
    ip,
  } satisfies IMember.ICreate;

  // Validate that the API returns error for password too short
  await TestValidator.error(
    "registration should fail with password too short (11 characters)",
    async () => {
      await api.functional.auth.member.join(connection, {
        body: requestBody,
      });
    },
  );
}
