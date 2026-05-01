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
 * Test that a non-moderator member is rejected when attempting to ban another
 * member from a community.
 *
 * Validates the authorization boundary for community ban creation: only
 * moderators and the community owner are permitted to issue bans. An ordinary
 * member who is neither a moderator nor the owner must receive a 403 Forbidden
 * rejection when attempting to ban another member.
 *
 * This test verifies that the governance hierarchy is correctly enforced — the
 * ban endpoint is a privileged moderation action and the platform must not
 * allow unauthorized members to exercise moderation powers. The community owner
 * holds supreme authority by default, but ordinary members who have not been
 * appointed as moderators lack any moderation privileges.
 *
 * 1. Register and authenticate as the community owner via authorize_member_join.
 * 2. Owner creates a community via generate_random_community_hub_member_communities_create.
 * 3. Register and authenticate as a separate non-moderator member via authorize_member_join.
 * 4. Non-moderator attempts to ban a random member from the community.
 * 5. Validates the request is rejected with HTTP 403 Forbidden.
 */
export async function test_api_community_ban_by_non_moderator_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner registers and creates community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_community_hub_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Non-moderator registers
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(nonModeratorConnection, {});
  // 3. Non-moderator attempts to ban — must be rejected with 403
  await TestValidator.httpError(
    "non-moderator cannot issue a ban in a community they do not moderate",
    403,
    async () => {
      await api.functional.communityHub.member.communities.bans.create(
        nonModeratorConnection,
        {
          communityName: community.name,
          body: {
            username: RandomGenerator.name(),
          } satisfies ICommunityHubCommunityBan.ICreate,
        },
      );
    },
  );
}
