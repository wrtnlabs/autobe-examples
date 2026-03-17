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

export async function test_api_moderator_assignment_rejected_for_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the first member (owner) and create a community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // Step 2: Create a new community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register a second member (regular member - no elevated role)
  const regularMemberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(regularMemberConnection, {});
  // Step 4: Register a third member (target for the blocked moderator assignment)
  const targetMemberConnection: api.IConnection = { host: connection.host };
  const targetMemberAuth = await authorize_member_join(
    targetMemberConnection,
    {},
  );
  typia.assert(targetMemberAuth);
  // Step 5: Attempt moderator assignment as the regular member (should be rejected with 403)
  await TestValidator.error(
    "regular member cannot assign moderators",
    async () => {
      await generate_random_community_member_communities_moderators_create(
        regularMemberConnection,
        {
          body: { member_id: targetMemberAuth.id },
          params: { communityId: community.id },
        },
      );
    },
  );
}
