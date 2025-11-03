import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import type { ICommunityBbsPushToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPushToken";

export async function test_api_push_token_register_idempotent_same_member(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * - Ensure registering the same push token twice for the same community member
   *   is idempotent: second call returns the same push token metadata (no
   *   duplicate active rows) and the API does NOT echo the raw sensitive token
   *   in responses.
   *
   * Steps:
   *
   * 1. Create a community member via /auth/communityMember/join
   * 2. Register a push token for that member
   * 3. Register the same push token again
   * 4. Assert idempotency and security constraints
   */

  // 1) Create (join) a new community member
  const username = `u${RandomGenerator.alphaNumeric(8)}`; // conforms to allowed username pattern
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Passw0rd!"; // meets password policy

  const joinBody = {
    email,
    username,
    password,
    session_context: {
      href: "http://localhost/e2e/join",
      referrer: "http://localhost/",
      ip: null,
      session_ttl_seconds: null,
    },
  } satisfies ICommunityBbsCommunityMember.ICreate;

  const authorized: ICommunityBbsCommunityMember.IAuthorized =
    await api.functional.auth.communityMember.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // Extract summary for username (should equal provided username)
  const member = authorized.member;
  typia.assert(member);
  TestValidator.equals(
    "joined member username matches",
    member.username,
    username,
  );

  // 2) Prepare push token payload (single raw token used twice)
  const rawToken = RandomGenerator.alphaNumeric(32);
  const device_id = RandomGenerator.alphaNumeric(8);
  const pushBody = {
    token: rawToken,
    provider: "fcm",
    device_id,
    platform: "android",
    fingerprint: RandomGenerator.alphaNumeric(10),
    expired_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
  } satisfies ICommunityBbsPushToken.ICreate;

  // 3) First registration
  const created1: ICommunityBbsPushToken =
    await api.functional.communityBbs.communityMember.communityMembers.pushTokens.create(
      connection,
      {
        username: member.username,
        body: pushBody,
      },
    );
  typia.assert(created1);

  TestValidator.predicate(
    "first push token has id",
    typeof created1.id === "string",
  );
  TestValidator.equals("first push token not revoked", created1.revoked, false);

  // Ensure server did not return the raw token in response object (safety check)
  TestValidator.predicate(
    "first response does not include raw token",
    !Object.prototype.hasOwnProperty.call(created1 as object, "token"),
  );

  // 4) Second registration with identical payload (idempotency)
  const created2: ICommunityBbsPushToken =
    await api.functional.communityBbs.communityMember.communityMembers.pushTokens.create(
      connection,
      {
        username: member.username,
        body: pushBody,
      },
    );
  typia.assert(created2);

  // Idempotency expectations: same resource id and stable metadata
  TestValidator.equals(
    "idempotent: same id returned",
    created2.id,
    created1.id,
  );
  TestValidator.equals(
    "idempotent: revoked still false",
    created2.revoked,
    false,
  );
  TestValidator.equals(
    "idempotent: created_at stable",
    created2.created_at,
    created1.created_at,
  );

  // Server must not echo raw token on second response either
  TestValidator.predicate(
    "second response does not include raw token",
    !Object.prototype.hasOwnProperty.call(created2 as object, "token"),
  );
}
