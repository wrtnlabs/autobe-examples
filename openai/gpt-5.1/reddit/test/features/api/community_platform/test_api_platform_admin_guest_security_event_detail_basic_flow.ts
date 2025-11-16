import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { ICommunityPlatformGuestuserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuserSession";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEventOfGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfGuestuser";

/**
 * Basic happy-path validation for guest-linked user security event detail
 * retrieval as a platform administrator.
 *
 * Business intent:
 *
 * - Ensure that, after a platform administrator joins and at least one account
 *   status definition exists, the guest-linked security event detail endpoint
 *   can be invoked and returns a structurally valid
 *   ICommunityPlatformUserSecurityEventOfGuestuser DTO.
 * - Validate that core base event attributes, guest-specific linkage fields, and
 *   denormalized associations are populated consistently, in line with the DTO
 *   contracts.
 *
 * Scenario steps implemented in this test:
 *
 * 1. Register a new platform administrator using POST /auth/platformAdmin/join.
 * 2. Create an account status definition using POST
 *    /communityPlatform/platformAdmin/accountStatuses.
 * 3. Generate a random UUID as the target securityEventId (in non-simulate mode
 *    this expects a real row, while in simulate mode the SDK will provide
 *    random-but-valid data). As we have no creation API for guest-linked
 *    security events, this test focuses on structural correctness rather than
 *    persistence coupling.
 * 4. Call GET
 *    /communityPlatform/guestUser/userSecurityEvents/{securityEventId}/guest
 *    via
 *    api.functional.communityPlatform.guestUser.userSecurityEvents.guest.at.
 * 5. Assert that the response matches the
 *    ICommunityPlatformUserSecurityEventOfGuestuser schema using typia.assert
 *    and perform additional semantic checks on key linkages:
 *
 *    - Non-empty base event fields (id, actor_type, event_type, ip, user_agent,
 *         created_at).
 *    - Non-empty guest linkage fields (guest_user_id, guest_link_created_at).
 *    - If account_status_id and accountStatus are both present, their ids must
 *         match.
 *    - If guestUser is present, its id must equal guest_user_id.
 *    - If guest_user_session_id and guestUserSession are both present,
 *         guestUserSession.id must equal guest_user_session_id and
 *         guestUserSession.guestUser.id must equal guest_user_id.
 */
export async function test_api_platform_admin_guest_security_event_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Platform admin joins to obtain an authenticated context.
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const adminAuthorized: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  TestValidator.predicate(
    "platform admin id should be non-empty",
    adminAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin access token should be non-empty",
    adminAuthorized.token.access.length > 0,
  );

  // 2. Create an account status definition for completeness of environment.
  const statusKey = "ACTIVE_GUEST";
  const accountStatusCreateBody = {
    key: statusKey,
    label: "Active Guest",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isLoginAllowed: true,
    isPostingAllowed: true,
    isVotingAllowed: true,
    requiresManualReview: false,
  } satisfies ICommunityPlatformAccountStatus.ICreate;

  const createdStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert(createdStatus);

  TestValidator.equals(
    "created account status key should match requested key",
    createdStatus.key,
    statusKey,
  );

  // 3. Prepare a random UUID for the security event id and call the detail API.
  const securityEventId = typia.random<string & tags.Format<"uuid">>();

  const output: ICommunityPlatformUserSecurityEventOfGuestuser =
    await api.functional.communityPlatform.guestUser.userSecurityEvents.guest.at(
      connection,
      {
        securityEventId,
      },
    );
  typia.assert(output);

  // 4. Base event field semantics.
  TestValidator.predicate(
    "guest security event id should be non-empty",
    output.id.length > 0,
  );
  TestValidator.predicate(
    "guest security event actor_type should be non-empty",
    output.actor_type.length > 0,
  );
  TestValidator.predicate(
    "guest security event event_type should be non-empty",
    output.event_type.length > 0,
  );
  TestValidator.predicate(
    "guest security event ip should be non-empty",
    output.ip.length > 0,
  );
  TestValidator.predicate(
    "guest security event user_agent should be non-empty",
    output.user_agent.length > 0,
  );
  TestValidator.predicate(
    "guest security event created_at should be non-empty",
    output.created_at.length > 0,
  );

  // 5. Guest-specific linkage fields.
  TestValidator.predicate(
    "guest security event guest_user_id should be non-empty",
    output.guest_user_id.length > 0,
  );
  TestValidator.predicate(
    "guest security event guest_link_created_at should be non-empty",
    output.guest_link_created_at.length > 0,
  );

  // 6. Denormalized associations consistency.
  // accountStatus vs account_status_id
  if (
    output.account_status_id !== null &&
    output.account_status_id !== undefined
  ) {
    if (output.accountStatus !== undefined) {
      TestValidator.equals(
        "accountStatus.id should match account_status_id when both present",
        output.accountStatus.id,
        output.account_status_id,
      );
    }
  }

  // guestUser vs guest_user_id
  if (output.guestUser !== undefined) {
    TestValidator.equals(
      "guestUser.id should match guest_user_id",
      output.guestUser.id,
      output.guest_user_id,
    );
    TestValidator.predicate(
      "guestUser.created_at should be non-empty",
      output.guestUser.created_at.length > 0,
    );
  }

  // guestUserSession vs guest_user_session_id and guestUser linkage
  if (
    output.guest_user_session_id !== null &&
    output.guest_user_session_id !== undefined &&
    output.guestUserSession !== undefined
  ) {
    TestValidator.equals(
      "guestUserSession.id should match guest_user_session_id when both present",
      output.guestUserSession.id,
      output.guest_user_session_id,
    );
    TestValidator.equals(
      "guestUserSession.guestUser.id should match guest_user_id",
      output.guestUserSession.guestUser.id,
      output.guest_user_id,
    );
    TestValidator.predicate(
      "guestUserSession.created_at should be non-empty",
      output.guestUserSession.created_at.length > 0,
    );
  }
}
