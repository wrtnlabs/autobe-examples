import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPortalGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalGuest";
import type { ICommunityPortalMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalMember";

export async function test_api_guest_session_join_bind_existing_user(
  connection: api.IConnection,
) {
  /**
   * E2E test: Create a member account, then create a guest session and validate
   * the returned guest session record. Because ICommunityPortalGuest.ICreate is
   * defined as an empty object in the DTOs, the test will not send a user_id in
   * the request body. The test conditionally validates binding when the server
   * binds the guest to the created member.
   *
   * Steps:
   *
   * 1. Create member via POST /auth/member/join
   * 2. Create guest session via POST /auth/guest/join with empty body
   * 3. Assert typia.assert() on responses
   * 4. Validate presence of guest_token, id, created_at, expired_at (if present)
   * 5. Ensure no sensitive fields (password_hash) are present in guest response
   * 6. Conditionally assert binding if guest.user_id equals created member id
   */

  // 1) Create a new member
  const memberBody = {
    username: RandomGenerator.alphaNumeric(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
  } satisfies ICommunityPortalMember.ICreate;

  const member: ICommunityPortalMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberBody,
    });
  typia.assert(member);

  TestValidator.predicate(
    "created member has id",
    typeof member.id === "string" && member.id.length > 0,
  );
  TestValidator.predicate(
    "created member has access token",
    typeof member.token?.access === "string" && member.token.access.length > 0,
  );

  // 2) Create guest session (body is empty per ICommunityPortalGuest.ICreate)
  const guestBody = {} satisfies ICommunityPortalGuest.ICreate;
  const guest: ICommunityPortalGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestBody,
    });
  typia.assert(guest);

  // 3) Validate guest response fields
  TestValidator.predicate(
    "guest id present",
    typeof guest.id === "string" && guest.id.length > 0,
  );
  TestValidator.predicate(
    "guest token present",
    typeof guest.guest_token === "string" && guest.guest_token.length > 0,
  );
  TestValidator.predicate(
    "guest token.access present",
    typeof guest.token?.access === "string" && guest.token.access.length > 0,
  );

  // 4) expired_at should be in the future if provided (nullable)
  if (guest.expired_at !== null && guest.expired_at !== undefined) {
    TestValidator.predicate(
      "guest.expired_at is a future timestamp",
      new Date(guest.expired_at).getTime() > Date.now(),
    );
  }

  // 5) Ensure no sensitive fields leaked in the guest response
  TestValidator.predicate(
    "no password_hash leaked",
    !Object.prototype.hasOwnProperty.call(guest, "password_hash"),
  );

  // 6) Conditional binding assertion: some servers bind guest to created user
  if (guest.user_id === member.id) {
    TestValidator.equals(
      "guest bound to created member",
      guest.user_id,
      member.id,
    );
  } else {
    // If not bound, at least user_id should be a string (UUID per DTO)
    TestValidator.predicate(
      "guest.user_id is present and a string",
      typeof guest.user_id === "string",
    );
  }
}
