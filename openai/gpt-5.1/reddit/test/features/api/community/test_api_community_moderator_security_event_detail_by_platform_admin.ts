import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorAssignment";
import type { ICommunityPlatformCommunityModeratorSession } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModeratorSession";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformUserSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEvent";
import type { ICommunityPlatformUserSecurityEventOfCommunitymoderator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserSecurityEventOfCommunitymoderator";

/**
 * Validate that a platform admin can call the moderator-specific
 * user-security-event detail endpoint and receive a structurally valid
 * response, after performing realistic admin and member setup flows.
 *
 * Business / test flow (adapted to available APIs):
 *
 * 1. Platform admin self-registers via /auth/platformAdmin/join.
 * 2. Platform admin creates an account status master record.
 * 3. Platform admin creates a community visibility level master record.
 * 4. Member user self-registers via /auth/memberUser/join.
 * 5. Member user creates a community using the created visibility level code.
 * 6. Platform admin logs in again (actor switching demonstration).
 * 7. Platform admin creates a community moderator assignment for the community.
 * 8. Platform admin invokes GET
 *    /communityPlatform/platformAdmin/userSecurityEvents/{securityEventId}/communityModerator
 *    with a random UUID securityEventId and verifies the response type and
 *    basic semantics.
 *
 * Because there is no API to create concrete moderator-bound security events,
 * this test focuses on exercising the endpoint contract and DTO structure
 * rather than persistence semantics for a known event ID.
 */
export async function test_api_community_moderator_security_event_detail_by_platform_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Platform admin joins (registration + initial authentication)
  const adminJoinInput = typia.random<ICommunityPlatformPlatformadmin.IJoin>();
  const adminAuthorizedFromJoin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinInput,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromJoin,
  );

  // 2. Platform admin creates an account status master record
  const accountStatusCreateBody =
    typia.random<ICommunityPlatformAccountStatus.ICreate>();
  const accountStatus: ICommunityPlatformAccountStatus =
    await api.functional.communityPlatform.platformAdmin.accountStatuses.create(
      connection,
      {
        body: accountStatusCreateBody,
      },
    );
  typia.assert<ICommunityPlatformAccountStatus>(accountStatus);

  // 3. Platform admin creates a community visibility level master record
  const visibilityLevelCreateBody =
    typia.random<ICommunityPlatformCommunityVisibilityLevel.ICreate>();
  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityLevelCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 4. Member user joins (self-registration)
  const memberJoinBody =
    typia.random<ICommunityPlatformMemberuser.IJoinRequest>();
  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert<ICommunityPlatformMemberuser.IAuthorized>(memberAuthorized);

  // 5. Member user creates a community using the visibility level code
  const communityCreateBodyBase =
    typia.random<ICommunityPlatformCommunity.ICreate>();
  const communityCreateBody = {
    ...communityCreateBodyBase,
    visibilityLevelCode: visibilityLevelCreateBody.code,
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunity>(community);

  // 6. Platform admin logs in again (actor switching demonstration)
  const adminLoginBodyBase =
    typia.random<ICommunityPlatformPlatformadmin.ILogin>();
  const adminLoginBody = {
    ...adminLoginBodyBase,
    identifier: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies ICommunityPlatformPlatformadmin.ILogin;
  const adminAuthorizedFromLogin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(
    adminAuthorizedFromLogin,
  );

  // 7. Platform admin creates a community moderator assignment
  const moderatorAssignmentCreateBody =
    typia.random<ICommunityPlatformCommunityModeratorAssignment.ICreate>();
  const moderatorAssignment: ICommunityPlatformCommunityModeratorAssignment =
    await api.functional.communityPlatform.platformAdmin.communities.moderatorAssignments.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: moderatorAssignmentCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityModeratorAssignment>(
    moderatorAssignment,
  );

  // 8. Platform admin retrieves moderator-specific security event binding
  const securityEventId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const moderatorSecurityEvent: ICommunityPlatformUserSecurityEventOfCommunitymoderator =
    await api.functional.communityPlatform.platformAdmin.userSecurityEvents.communityModerator.at(
      connection,
      {
        securityEventId,
      },
    );
  typia.assert<ICommunityPlatformUserSecurityEventOfCommunitymoderator>(
    moderatorSecurityEvent,
  );

  const securityEvent: ICommunityPlatformUserSecurityEvent =
    moderatorSecurityEvent.securityEvent;
  const communityModerator: ICommunityPlatformCommunityModerator.ISummary =
    moderatorSecurityEvent.communityModerator;
  const moderatorSession:
    | ICommunityPlatformCommunityModeratorSession.ISummary
    | undefined = moderatorSecurityEvent.communityModeratorSession;

  // Basic semantic validations that do not depend on persistence semantics
  TestValidator.predicate(
    "securityEvent.actor_type should be a non-empty string",
    securityEvent.actor_type.length > 0,
  );

  TestValidator.predicate(
    "communityModerator.username should be a non-empty string",
    communityModerator.username.length > 0,
  );

  TestValidator.predicate(
    "communityModerator.email should be a non-empty string",
    communityModerator.email.length > 0,
  );

  if (moderatorSession !== undefined) {
    TestValidator.predicate(
      "moderatorSession.ip should be a non-empty string when present",
      moderatorSession.ip.length > 0,
    );
  }
}
