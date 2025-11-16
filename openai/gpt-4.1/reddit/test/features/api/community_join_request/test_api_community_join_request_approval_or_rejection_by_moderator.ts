import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityJoinRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityJoinRequest";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * A registered moderator can approve or reject a pending join request of a
 * given community. This test verifies moderator authentication, correct status
 * update (pending → approved/rejected), enforcement of permitted status
 * transitions, audit logging of the acting moderator, and validation that
 * repeat/inapplicable status changes are properly rejected.
 *
 * 1. Register and authenticate a moderator via POST /auth/moderator/join
 * 2. Simulate a pending join request record for a valid community and user
 * 3. As moderator, approve the pending join request via PUT
 *    /communityPlatform/moderator/communities/{communityName}/joinRequests/{joinRequestId}
 * 4. Assert updated status and that processed_by_moderator is populated
 * 5. Attempt invalid repeat approval (or update after non-pending), expect error
 * 6. Verify audit fields (processed_at, updated_at) are set on update
 */
export async function test_api_community_join_request_approval_or_rejection_by_moderator(
  connection: api.IConnection,
) {
  // 1. Moderator registration and authentication
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorBody = {
    email: moderatorEmail,
    password: RandomGenerator.alphaNumeric(12),
    status: "active",
    href: "https://platform.test/moderator-join",
    referrer: "https://platform.test/landing",
    ip: null,
  } satisfies ICommunityPlatformModerator.ICreate;
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorBody,
    });
  typia.assert(moderator);

  // 2. Simulate/prepare a pending join request (mock join request object, since there is no exposed join-request creation interface)
  // We'll create realistic mock objects for community and user for reference fields; ids must be valid UUIDs.
  const communitySummary: ICommunityPlatformCommunity.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    name: RandomGenerator.alphaNumeric(16),
    display_title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 8 }),
    visibility: RandomGenerator.pick([
      "invite-only",
      "private",
    ]) satisfies string as string,
    status: "active",
    image_url: null,
  };
  const userSummary: ICommunityPlatformUser.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
  };
  const joinRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const joinRequest: ICommunityPlatformCommunityJoinRequest = {
    id: joinRequestId,
    community: communitySummary,
    user: userSummary,
    processed_by_moderator: null,
    request_message: RandomGenerator.paragraph({ sentences: 2 }),
    status: "pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    processed_at: null,
    deleted_at: null,
  };

  // 3. Approve the join request by moderator
  const updateBody = {
    status: "approved",
  } satisfies ICommunityPlatformCommunityJoinRequest.IUpdate;
  const approvedRequest: ICommunityPlatformCommunityJoinRequest =
    await api.functional.communityPlatform.moderator.communities.joinRequests.update(
      connection,
      {
        communityName: communitySummary.name,
        joinRequestId: joinRequestId,
        body: updateBody,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status updated to approved",
    approvedRequest.status,
    "approved",
  );
  TestValidator.predicate(
    "moderator recorded in processed_by_moderator",
    approvedRequest.processed_by_moderator !== null &&
      approvedRequest.processed_by_moderator !== undefined,
  );

  // 4. Attempt to update already-approved join request (should fail)
  await TestValidator.error(
    "rejecting non-pending join request is not allowed",
    async () => {
      await api.functional.communityPlatform.moderator.communities.joinRequests.update(
        connection,
        {
          communityName: communitySummary.name,
          joinRequestId: joinRequestId,
          body: { status: "rejected" },
        },
      );
    },
  );

  // 5. Optional: Attempt to re-approve (should also fail)
  await TestValidator.error(
    "cannot re-approve already approved join request",
    async () => {
      await api.functional.communityPlatform.moderator.communities.joinRequests.update(
        connection,
        {
          communityName: communitySummary.name,
          joinRequestId: joinRequestId,
          body: { status: "approved" },
        },
      );
    },
  );

  // 6. Verify audit fields: processed_at and updated_at are set after approval
  TestValidator.predicate(
    "processed_at is set after approval",
    approvedRequest.processed_at !== null &&
      approvedRequest.processed_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is updated after approval",
    approvedRequest.updated_at !== null &&
      approvedRequest.updated_at !== undefined,
  );
}
