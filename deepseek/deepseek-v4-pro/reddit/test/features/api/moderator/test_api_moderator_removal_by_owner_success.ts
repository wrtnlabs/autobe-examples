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
import { generate_random_community_hub_member_communities_moderators_create } from "../../../generate/generate_random_community_hub_member_communities_moderators_create";
import { prepare_random_community_hub_community } from "../../../prepare/prepare_random_community_hub_community";
import { prepare_random_community_hub_community_moderator } from "../../../prepare/prepare_random_community_hub_community_moderator";

/**
 * Test community owner successfully removes a moderator from the governance roster.
 *
 * Validates the complete moderator removal workflow: community owner registers,
 * creates a community, appoints another member as moderator, then revokes that
 * moderator's privileges. The removal endpoint returns 204 No Content on success,
 * and subsequent removal attempts on the same user are idempotent.
 *
 * 1. Register a member (the future moderator) via authorize_member_join.
 * 2. Register the community owner via authorize_member_join on a separate connection.
 * 3. Owner creates a community using the generation utility.
 * 4. Owner appoints the moderator by username using the moderator creation utility.
 * 5. Owner removes the moderator via the erase endpoint — expects void success.
 * 6. Verify idempotent removal by calling erase again with the same userId.
 */
export async function test_api_moderator_removal_by_owner_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the member who will become moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderator);
  // 2. Register the community owner
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
  // 4. Owner appoints the moderator
  const moderatorRecord =
    await generate_random_community_hub_member_communities_moderators_create(
      ownerConnection,
      {
        body: { username: moderator.username },
        params: { communityName: community.name },
      },
    );
  typia.assert(moderatorRecord);
  // 5. Owner removes the moderator — expects 204 No Content
  await api.functional.communityHub.member.communities.moderators.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: moderator.id,
    },
  );
  // 6. Verify idempotent removal — calling again succeeds
  await api.functional.communityHub.member.communities.moderators.erase(
    ownerConnection,
    {
      communityName: community.name,
      userId: moderator.id,
    },
  );
}
