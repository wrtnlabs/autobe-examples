import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
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
 * Test that only subscribed members can be appointed as moderators.
 *
 * This test validates a key business rule in the moderator appointment workflow:
 * a member must be subscribed to a community before they can be granted
 * moderation privileges. This ensures moderators are active community
 * participants who understand the community culture.
 *
 * **Test Flow:**
 * 1. Owner creates account and creates a community (becomes owner automatically)
 * 2. Another member creates account but does NOT subscribe to the community
 * 3. Owner attempts to appoint the non-subscribed member as moderator
 * 4. Expect error (400 Bad Request) because target is not a subscriber
 */
export async function test_api_moderator_appointment_non_subscriber_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Create a community (creator becomes owner automatically)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Create target member who will NOT subscribe to the community
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  typia.assert(targetMember);
  // 4. Verify that non-subscribed member cannot be appointed as moderator
  // This should fail with 400 Bad Request (member not subscribed)
  await TestValidator.httpError(
    "non-subscriber cannot be appointed as moderator",
    [400, 403],
    async () => {
      await api.functional.community.member.communities.moderators.create(
        ownerConnection,
        {
          communityName: community.name,
          body: {
            member_username: targetMember.username,
          } satisfies ICommunityModerator.ICreate,
        },
      );
    },
  );
}
