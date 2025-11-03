import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function test_api_community_member_registration(
  connection: api.IConnection,
) {
  // 1. Prepare unique test data
  const ts = Date.now();
  const username = `alice_test_${ts}`;
  const email = `alice.test.${ts}@example.test`;

  const requestBody = {
    email,
    username,
    password: "Passw0rd!",
    display_name: RandomGenerator.name(),
    profile: {
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 6, wordMin: 3, wordMax: 8 }),
      avatar_uri: undefined,
    },
    session_context: {
      href: "https://example.test/welcome",
      referrer: "https://example.test/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  // 2. Happy path: create account and receive tokens + session summary
  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: requestBody,
    });
  // Runtime type validation of entire response
  typia.assert(authorized);

  // Business-level validations
  TestValidator.predicate(
    "access token is a non-empty string",
    typeof authorized.token.access === "string" &&
      authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is a non-empty string",
    typeof authorized.token.refresh === "string" &&
      authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "session summary exists with id",
    typeof authorized.session.id === "string" &&
      authorized.session.id.length > 0,
  );
  TestValidator.predicate(
    "session has created_at as date-time string",
    typeof authorized.session.created_at === "string" &&
      authorized.session.created_at.length > 0,
  );

  // Ensure sensitive fields are not returned in member summary
  TestValidator.predicate(
    "member summary does not include password",
    !("password" in (authorized.member as unknown as Record<string, unknown>)),
  );
  TestValidator.predicate(
    "member summary does not include email",
    !("email" in (authorized.member as unknown as Record<string, unknown>)),
  );

  // 3. Negative case: duplicate registration should fail
  await TestValidator.error("duplicate registration should fail", async () => {
    await api.functional.auth.communityMember.join(connection, {
      body: requestBody,
    });
  });
}
