import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityBan";
import type { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import type { ICommunityHubPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_hub_member_communities_bans_create } from "../../../generate/generate_random_community_hub_member_communities_bans_create";
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_ban } from "../../../prepare/prepare_random_community_hub_community_ban";

/**
 * Test that a community owner can retrieve a complete active ban record after issuing a ban.
 *
 * Verifies the full ban retrieval workflow where a community owner bans a member
 * and then fetches the ban record by its ID. The test validates that the returned
 * ban structure contains all required fields with correct values, confirming that
 * the audit trail is complete and the ban is still active.
 *
 * 1. A member account is created (to be banned) and their username is captured.
 * 2. An owner account is created, who then creates a community.
 * 3. The owner bans the first member from the community with a specified reason.
 * 4. The owner retrieves the ban record using the ban ID.
 * 5. Validates that the ban record contains the correct banned member, community,
 *    issuing owner, matching reason, null unbanned_at and unbannedBy indicating
 *    the ban is active, and valid ISO 8601 timestamps with null deleted_at.
 */
export async function test_api_community_ban_retrieve_active_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create the member who will be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 3. Owner creates a community
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 4. Owner bans the member with a specific reason
  const banReason = RandomGenerator.paragraph({ sentences: 3 });
  const ban =
    await generate_random_community_hub_member_communities_bans_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          username: member.username,
          reason: banReason,
        },
      },
    );
  typia.assert(ban);
  // 5. Owner retrieves the ban by ID
  const retrieved =
    await api.functional.communityHub.member.communities.bans.at(
      ownerConnection,
      {
        communityName: community.name,
        banId: ban.id,
      },
    );
  typia.assert(retrieved);
  // 6. Validations
  TestValidator.equals(
    "bannedMember matches",
    retrieved.bannedMember.username,
    member.username,
  );
  TestValidator.equals(
    "community matches",
    retrieved.community.name,
    community.name,
  );
  TestValidator.equals(
    "issuedBy matches owner",
    retrieved.issuedBy.username,
    owner.username,
  );
  TestValidator.equals("reason matches", retrieved.reason, banReason);
  TestValidator.equals(
    "ban is active - unbanned_at is null",
    retrieved.unbanned_at,
    null,
  );
  TestValidator.equals(
    "ban is active - unbannedBy is null",
    retrieved.unbannedBy,
    null,
  );
  TestValidator.equals(
    "ban record not soft-deleted",
    retrieved.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    () => !isNaN(Date.parse(retrieved.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    () => !isNaN(Date.parse(retrieved.updated_at)),
  );
}
