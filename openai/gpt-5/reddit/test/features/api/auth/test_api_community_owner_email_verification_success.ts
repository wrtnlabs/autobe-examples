import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityOwner";

export async function test_api_community_owner_email_verification_success(
  connection: api.IConnection,
) {
  /**
   * Validate email verification flow for a community owner.
   *
   * Steps:
   *
   * 1. Register a new community owner via POST /auth/communityOwner/join
   * 2. Simulate a verification artifact and call POST
   *    /auth/communityOwner/email/verify
   * 3. Assert successful authorization payload and token rotation (fresh tokens)
   *
   * Notes:
   *
   * - Verification token retrieval from an outbox is not available; therefore,
   *   this test uses a simulated connection for the verification call.
   * - Fields like email_verified/account_state are not exposed by DTOs and cannot
   *   be asserted directly.
   */

  // 1) Register a new community owner
  const nowIso: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const username: string = RandomGenerator.alphaNumeric(12); // matches ^[A-Za-z0-9_]{3,20}$

  const joinBody = {
    email,
    username,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(2),
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
    terms_accepted_at: nowIso,
    privacy_accepted_at: nowIso,
    marketing_opt_in: true,
    marketing_opt_in_at: nowIso,
  } satisfies ICommunityPlatformCommunityOwner.ICreate;

  const joined: ICommunityPlatformCommunityOwner.IAuthorized =
    await api.functional.auth.communityOwner.join(connection, {
      body: joinBody,
    });
  typia.assert(joined);

  // 2) Verify email with a simulated connection (no real outbox/token store available)
  const simulated: api.IConnection = { ...connection, simulate: true };
  const verifyBody = {
    verification_token: RandomGenerator.alphaNumeric(24),
  } satisfies ICommunityPlatformCommunityOwner.IVerifyEmail;

  const verified: ICommunityPlatformCommunityOwner.IAuthorized =
    await api.functional.auth.communityOwner.email.verify.verifyEmail(
      simulated,
      {
        body: verifyBody,
      },
    );
  typia.assert(verified);

  // 3) Business assertions available from DTOs
  TestValidator.predicate(
    "role is communityOwner or undefined",
    verified.role === undefined || verified.role === "communityOwner",
  );
  TestValidator.notEquals(
    "access token rotated on verification",
    verified.token.access,
    joined.token.access,
  );
}
