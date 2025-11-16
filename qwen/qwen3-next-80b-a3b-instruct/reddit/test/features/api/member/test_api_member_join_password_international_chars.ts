import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_member_join_password_international_chars(
  connection: api.IConnection,
) {
  // Generate a random, secure international password with mixed character types
  const password =
    RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 1,
      sentenceMax: 1,
      wordMin: 8,
      wordMax: 16,
    }) + "!¡¿\u00a1\u00bf\u65e5\u672c\u8a9e 豆腐 🌍️"; // Combine random string with international characters

  // Ensure password meets minimum length requirement
  TestValidator.predicate(
    "international password has minimum length",
    () => password.length >= 12,
  );

  // Validate that the password contains an international character (non-English)
  TestValidator.predicate(
    "international password contains non-ASCII characters",
    () => /[^\x00-\x7F]/.test(password),
  );

  // Generate a valid email address
  const email = typia.random<string & tags.Format<"email">>();

  // Generate valid URI values for href and referrer
  const href =
    RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }).replace(/ /g, ".") + ".com/join";
  const referrer =
    RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 5,
      wordMax: 10,
    }).replace(/ /g, ".") + ".com";

  // Generate a valid public IPv4 address
  const ip = typia.random<string & tags.Format<"ipv4">>();

  // Call the join endpoint with the international password
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: email,
        password: password,
        href: href,
        referrer: referrer,
        ip: ip,
      } satisfies IMember.ICreate,
    });

  // Validate the response with complete type assertion
  typia.assert(member);

  // Validate that the email matches the one we provided
  TestValidator.equals("member email matches", member.email, email);

  // Validate authentication token properties
  const token = member.token;
  typia.assert<IAuthorizationToken>(token);
  TestValidator.predicate(
    "member has access token",
    () => token.access.length > 0,
  );
  TestValidator.predicate(
    "member has refresh token",
    () => token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expires in future",
    () => token.expired_at > new Date().toISOString(),
  );
  TestValidator.predicate(
    "refresh token is usable",
    () => token.refreshable_until > token.expired_at,
  );
}
