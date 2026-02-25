import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
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

export async function test_api_moderator_removal_permission_denied(
  connection: api.IConnection,
): Promise<void> {
  // Test the authorization rule that only the community owner can remove moderators.
  // A non-owner moderator should receive 403 Forbidden when attempting to remove another moderator.
  // 1. User A (owner) creates account and community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 2. User B (moderator who will attempt removal) creates account and subscribes
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBAuth = await authorize_member_join(moderatorBConnection, {});
  typia.assert(moderatorBAuth);
  await api.functional.community.member.communities.subscribe(
    moderatorBConnection,
    { communityName: community.name },
  );
  // 3. User C (target moderator) creates account and subscribes
  const moderatorCConnection: api.IConnection = { host: connection.host };
  const moderatorCAuth = await authorize_member_join(moderatorCConnection, {});
  typia.assert(moderatorCAuth);
  await api.functional.community.member.communities.subscribe(
    moderatorCConnection,
    { communityName: community.name },
  );
  // 4. Owner appoints User B as moderator
  const moderatorB =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderatorBAuth.username },
      },
    );
  typia.assert(moderatorB);
  TestValidator.predicate("User B is not owner", moderatorB.is_owner === false);
  // 5. Owner appoints User C as moderator
  const moderatorC =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { member_username: moderatorCAuth.username },
      },
    );
  typia.assert(moderatorC);
  TestValidator.predicate("User C is not owner", moderatorC.is_owner === false);
  // 6. User B (non-owner moderator) attempts to remove User C
  // This should fail with 403 Forbidden
  await TestValidator.httpError(
    "non-owner moderator cannot remove another moderator",
    403,
    async () => {
      await api.functional.community.member.communities.moderators.removeModerator(
        moderatorBConnection,
        {
          communityName: community.name,
          moderatorId: moderatorC.id,
        },
      );
    },
  );
}
