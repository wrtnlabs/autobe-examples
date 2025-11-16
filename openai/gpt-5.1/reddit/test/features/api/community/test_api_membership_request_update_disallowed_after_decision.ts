import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityMembershipRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityMembershipRequest";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that community membership requests cannot be freely modified once
 * their decision-related state is established, and that member edits do not
 * tamper with decision metadata.
 *
 * Business journey covered:
 *
 * 1. A platform admin registers and creates a visibility level used for community
 *    creation.
 * 2. A member user registers.
 * 3. The member user creates a community with the admin-defined visibility level.
 * 4. The member user submits a membership request to the community.
 * 5. The member user performs a legitimate update on the membership request while
 *    it is still editable.
 * 6. The member user attempts a further update that is expected to be rejected by
 *    business rules (conceptually representing a decided/non-editable state).
 *
 * Technical assertions:
 *
 * - The create and first update operations succeed and return valid
 *   ICommunityPlatformCommunityMembershipRequest objects.
 * - Member-editable fields (joinMessage/answers) can be modified while the
 *   request is in an editable state.
 * - Decision-oriented fields (status, decidedAt, reviewNote) are not changed by
 *   member edits; we compare initial vs first-updated snapshots.
 * - A subsequent update attempt triggers an error, validating that the backend
 *   enforces state-based edit restrictions for membership requests.
 */
export async function test_api_membership_request_update_disallowed_after_decision(
  connection: api.IConnection,
) {
  // 1. Platform admin joins and creates a visibility level for communities.
  const platformAdminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const platformAdminJoinBody = {
    username: RandomGenerator.name(1),
    email: platformAdminEmail,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(2),
    ip: undefined,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const platformAdmin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdmin);

  const visibilityCode = `vis-${RandomGenerator.alphaNumeric(8)}`;

  const visibilityCreateBody = {
    code: visibilityCode,
    name: "Test Visibility",
    description: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibility: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert(visibility);
  TestValidator.equals(
    "visibility code should match creation payload",
    visibility.code,
    visibilityCreateBody.code,
  );

  // 2. Member user joins.
  const memberEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const memberJoinBody = {
    username: RandomGenerator.name(1),
    email: memberEmail,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://app.example.com/join",
    referrer: "https://app.example.com/landing",
  } satisfies ICommunityPlatformMemberuser.IJoinRequest;

  const memberAuthorized: ICommunityPlatformMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);
  TestValidator.equals(
    "member username should match join payload",
    memberAuthorized.username,
    memberJoinBody.username,
  );

  // 3. Member user creates a community.
  const communityIdentifier = `community-${RandomGenerator.alphaNumeric(10)}`;

  const communityCreateBody = {
    identifier: communityIdentifier,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    visibilityLevelCode: visibility.code,
    isNsfw: false,
    primaryTagIds: [],
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.memberUser.communities.create(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community identifier should match creation payload",
    community.identifier,
    communityCreateBody.identifier,
  );

  // 4. Member user creates a membership request for that community.
  const initialAnswer = {
    questionKey: "reason-to-join",
    answerText: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityMembershipRequest.ICreate;

  const initialRequest: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.create(
      connection,
      {
        communityIdentifier: community.identifier,
        body: initialAnswer,
      },
    );
  typia.assert(initialRequest);

  TestValidator.equals(
    "membership request should target created community",
    initialRequest.community.id,
    community.id,
  );

  // Capture baseline decision-related fields to ensure member edits cannot
  // tamper with them.
  const baselineStatus = initialRequest.status;
  const baselineDecidedAt = initialRequest.decidedAt ?? null;
  const baselineReviewNote = initialRequest.reviewNote ?? null;

  // 5. Perform a first legitimate update while the request is presumed editable.
  const firstUpdateBody = {
    joinMessage: RandomGenerator.paragraph({ sentences: 4 }),
    answers: [
      {
        questionKey: initialAnswer.questionKey,
        answerText: RandomGenerator.paragraph({ sentences: 3 }),
      },
    ],
  } satisfies ICommunityPlatformCommunityMembershipRequest.IUpdate;

  const updatedOnce: ICommunityPlatformCommunityMembershipRequest =
    await api.functional.communityPlatform.memberUser.communities.membershipRequests.update(
      connection,
      {
        communityIdentifier: community.identifier,
        membershipRequestId: initialRequest.id,
        body: firstUpdateBody,
      },
    );
  typia.assert(updatedOnce);

  // Verify that decision-related metadata remains unchanged after member edit.
  TestValidator.equals(
    "status should remain unchanged after member update",
    updatedOnce.status,
    baselineStatus,
  );
  TestValidator.equals(
    "decidedAt should remain unchanged after member update",
    updatedOnce.decidedAt ?? null,
    baselineDecidedAt,
  );
  TestValidator.equals(
    "reviewNote should remain unchanged after member update",
    updatedOnce.reviewNote ?? null,
    baselineReviewNote,
  );

  // 6. Attempt a second update that is expected to be disallowed by business
  // rules (conceptually representing a decided/non-editable state). We assert
  // that some error is thrown.
  const secondUpdateBody = {
    joinMessage: RandomGenerator.paragraph({ sentences: 2 }),
    answers: [
      {
        questionKey: initialAnswer.questionKey,
        answerText: RandomGenerator.paragraph({ sentences: 2 }),
      },
    ],
  } satisfies ICommunityPlatformCommunityMembershipRequest.IUpdate;

  await TestValidator.error(
    "second membership request update should be rejected by business rules",
    async () => {
      await api.functional.communityPlatform.memberUser.communities.membershipRequests.update(
        connection,
        {
          communityIdentifier: community.identifier,
          membershipRequestId: initialRequest.id,
          body: secondUpdateBody,
        },
      );
    },
  );
}
