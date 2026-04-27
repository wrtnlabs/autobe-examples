import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityImage";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_image } from "../../../prepare/prepare_random_community_platform_community_image";

/**
 * Test that a community owner's moderator record can be retrieved correctly.
 *
 * Validates the full flow of community creation and moderator record retrieval. A member registers, creates a community (becoming owner), and the auto-assigned moderator record with role 'owner' is retrieved and verified.
 *
 * Special attention is given to verifying that the owner role has `appointed_by` set to null (since the owner is auto-assigned upon community creation, not appointed by another member), and that the member and community details in the moderator record correctly reflect the original registration and community creation data.
 *
 * 1. Register a new member via `authorize_member_join`.
 * 2. The member creates a community via `generate_random_community_platform_member_communities_create`, which auto-assigns the member as the community owner and creates a moderator record.
 * 3. Retrieve the moderator record by its UUID — the auto-generated moderator ID from the community creation response.
 * 4. Validate the moderator record: role is 'owner', appointed_by is null, member and community details match.
 */
export async function test_api_moderator_view_owner_record(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2. Create a community — this auto-assigns the member as owner
  //    and creates a moderator record with role='owner', appointed_by=null
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Retrieve the moderator record
  //    The community creation response provides the moderator ID for the
  //    auto-assigned owner moderator record.
  const moderator = await api.functional.communityPlatform.moderators.at(
    memberConnection,
    {
      moderatorId: community.id,
    },
  );
  typia.assert(moderator);
  // 4. Validate role is 'owner'
  TestValidator.equals("role is owner", moderator.role, "owner");
  // 5. Validate appointed_by is null for the owner (auto-assigned)
  TestValidator.equals("appointed_by is null", moderator.appointed_by, null);
  // 6. Validate member details match the original registering member
  TestValidator.equals("member id matches", moderator.member.id, authorized.id);
  TestValidator.equals(
    "member username matches",
    moderator.member.username,
    authorized.username,
  );
  TestValidator.equals(
    "member email matches",
    moderator.member.email,
    authorized.email,
  );
  // 7. Validate community details match
  TestValidator.equals(
    "community id matches",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "community name matches",
    moderator.community.name,
    community.name,
  );
  TestValidator.equals(
    "community description matches",
    moderator.community.description,
    community.description,
  );
  // 8. Validate timestamps are present
  TestValidator.predicate(
    "moderator created_at is present",
    () => moderator.created_at.length > 0,
  );
  TestValidator.predicate(
    "moderator updated_at is present",
    () => moderator.updated_at.length > 0,
  );
}
