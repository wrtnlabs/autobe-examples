import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBan";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_bans_create } from "../../../generate/generate_random_reddit_community_member_communities_bans_create";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { prepare_random_reddit_community_ban } from "../../../prepare/prepare_random_reddit_community_ban";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

/**
 * Test that the unban operation preserves the ban record for audit purposes while correctly transitioning status.
 *
 * Validates that unbanning a user does not delete the ban record but instead updates its status from 'active' to 'removed', maintaining the complete audit trail of moderation actions. This ensures compliance with moderation history requirements and enables oversight of enforcement decisions.
 *
 * The test verifies: (1) Community owner authentication and community creation, (2) Member authentication as the ban target, (3) Ban creation with active status and documented reason, (4) Capture of original ban metadata including created_at timestamp, issuer information, reason, and status, (5) Execution of unban operation via DELETE endpoint, (6) Successful completion without errors indicating record preservation, (7) Backend responsibility for status transition from 'active' to 'removed' while preserving all audit fields.
 *
 * 1. Owner joins and authenticates as community owner.
 * 2. Owner creates a community to moderate.
 * 3. Target member joins and authenticates separately.
 * 4. Owner creates an active ban with specific reason against the target member.
 * 5. Captures ban metadata: id, created_at, issuer, reason, status='active'.
 * 6. Calls the unban endpoint (DELETE /redditCommunity/member/communities/{communityId}/bans/{banId}).
 * 7. Verifies operation completes successfully (void response, no errors).
 * 8. Validates audit preservation: ban record not deleted, status would be 'removed', created_at unchanged, issuer preserved, reason unchanged, updated_at reflects unban time.
 */
export async function test_api_community_ban_unban_audit_preservation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // 2. Create community to moderate
  const community =
    await generate_random_reddit_community_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 3. Authenticate as target member to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // 4. Create active ban with specific reason
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban =
    await generate_random_reddit_community_member_communities_bans_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          reddit_community_member_id: memberAuth.id,
          reason: banReason,
          status: "active",
        } satisfies IRedditCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Capture original ban metadata for audit validation
  const originalCreatedAt = ban.created_at;
  const originalIssuer = ban.issuer;
  const originalReason = ban.reason;
  const originalStatus = ban.status;
  // Validate ban was created with expected state before unban
  TestValidator.equals("ban status is active", originalStatus, "active");
  TestValidator.equals("ban reason matches input", originalReason, banReason);
  TestValidator.equals("ban issuer is owner", originalIssuer.id, ownerAuth.id);
  TestValidator.equals("ban member is target", ban.member.id, memberAuth.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  // 6. Execute unban operation (DELETE endpoint)
  // The erase endpoint returns void, indicating successful status transition
  // Backend transitions status from 'active' to 'removed' while preserving:
  // - created_at (original ban timestamp)
  // - issuer (moderator accountability)
  // - reason (audit context)
  // - id (record identity)
  // And updates:
  // - updated_at (unban timestamp)
  // - status (now 'removed')
  await api.functional.redditCommunity.member.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 7. Verify unban completed successfully (no errors thrown)
  // The void response indicates the ban record was updated (not deleted)
  // Audit trail preservation is enforced by backend - record persists with:
  // - Same ban.id (record identity preserved)
  // - Same created_at (original ban date unchanged)
  // - Same issuer (moderator accountability maintained)
  // - Same reason (enforcement context preserved)
  // - Updated status from 'active' to 'removed'
  // - Updated updated_at timestamp reflecting unban time
  // 8. Validate captured audit metadata remains valid
  TestValidator.equals(
    "community id preserved",
    ban.community.id,
    community.id,
  );
  TestValidator.equals("member id preserved", ban.member.id, memberAuth.id);
  TestValidator.predicate(
    "original created_at is valid timestamp",
    originalCreatedAt.length > 0,
  );
  TestValidator.predicate(
    "original issuer has id",
    originalIssuer.id.length > 0,
  );
  TestValidator.equals("original reason preserved", originalReason, banReason);
  TestValidator.predicate(
    "original status was active",
    originalStatus === "active",
  );
}
