import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that a community owner can successfully retrieve a specific moderation log entry after appointing a moderator. This scenario validates the complete workflow of viewing moderation audit trails with proper authorization.
 *
 * **Test Steps:**
 * 1. Register member A (community owner)
 * 2. Create a community with member A (member A becomes owner)
 * 3. Register member B (will become moderator)
 * 4. Appoint member B as moderator using member A's authentication (creates MODERATOR_ADDED log)
 * 5. Retrieve the specific moderation log entry using the moderator ID as reference
 *
 * **Validations:**
 * - Response body contains ICommunityModerationLog with all required fields
 * - actionType equals 'MODERATOR_ADDED'
 * - actor contains the owner's member summary who performed the action
 * - target contains the appointed moderator's member summary
 * - community matches the created community
 */
export async function test_api_moderation_log_retrieval_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register member A (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // Step 2: Create a community (member A becomes owner with full moderation privileges)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register member B (will be appointed as moderator)
  const moderatorMember = await authorize_member_join(
    { host: connection.host },
    {},
  );
  typia.assert(moderatorMember);
  // Step 4: Appoint member B as moderator using owner's authentication
  // This creates a MODERATOR_ADDED moderation log entry
  const newModerator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderatorMember.username },
      },
    );
  typia.assert(newModerator);
  // Step 5: Retrieve the specific moderation log entry
  // Using the moderator ID to reference the log entry for the MODERATOR_ADDED action
  const log =
    await api.functional.community.member.communities.moderationLogs.at(
      ownerConnection,
      {
        communityName: community.name,
        logId: newModerator.id,
      },
    );
  typia.assert(log);
  // Validation: Check action type
  TestValidator.equals(
    "action type is MODERATOR_ADDED",
    log.actionType,
    "MODERATOR_ADDED",
  );
  // Validation: Check actor is the owner who performed the action
  TestValidator.equals("actor is the owner", log.actor.id, owner.id);
  // Validation: Check target is the appointed moderator
  TestValidator.equals(
    "target is the moderator",
    log.target.id,
    moderatorMember.id,
  );
  // Validation: Check community matches
  TestValidator.equals("community matches", log.community.id, community.id);
}
