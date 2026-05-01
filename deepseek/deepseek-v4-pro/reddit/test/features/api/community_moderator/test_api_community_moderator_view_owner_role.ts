import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityHubComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubComment";
import type { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import type { ICommunityHubCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunityModerator";
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
import { generate_random_community_hub_member_communities_create } from "../../../generate/generate_random_community_hub_member_communities_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";

/**
 * Test retrieving the owner moderator role for a community.
 *
 * Validates that when a member creates a community, they are automatically
 * assigned the owner role and that the role can be retrieved via the
 * moderators endpoint. The owner role represents the highest authority in
 * the two-tier governance hierarchy and cannot be removed or transferred.
 *
 * The test verifies that the response includes the correct role type
 * ('owner'), the member field containing the owner's public profile matching
 * the community creator, the addedByMember field set to null (since ownership
 * is system-assigned at community creation, not through a user appointment
 * action), and the created_at timestamp matching the community's creation time.
 *
 * 1. Member authenticates by joining the platform.
 * 2. Member creates a new community, becoming its permanent owner.
 * 3. Retrieves the owner moderator role using the community name and member ID.
 * 4. Validates all owner role properties match expectations.
 */
export async function test_api_community_moderator_view_owner_role(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorizedMember = await authorize_member_join(memberConnection, {});
  // 2. Create a community (member becomes permanent owner)
  const community =
    await generate_random_community_hub_member_communities_create(
      memberConnection,
      {},
    );
  // 3. Retrieve the owner moderator role
  const moderator = await api.functional.communityHub.communities.moderators.at(
    memberConnection,
    {
      communityName: community.name,
      moderatorId: authorizedMember.id,
    },
  );
  typia.assert(moderator);
  // 4. Validate owner role properties
  TestValidator.equals("role is owner", moderator.role, "owner");
  TestValidator.equals("addedByMember is null", moderator.addedByMember, null);
  TestValidator.equals(
    "member id matches owner",
    moderator.member.id,
    authorizedMember.id,
  );
  TestValidator.equals(
    "created_at matches community",
    moderator.created_at,
    community.created_at,
  );
}
