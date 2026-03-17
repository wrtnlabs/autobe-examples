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

export async function test_api_moderator_detail_retrieval_by_assigned_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register the community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  // Step 2: Owner creates a new community
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register the second member (future moderator)
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(
    moderatorMemberConnection,
    {},
  );
  // Step 4: Owner assigns the second member as a moderator
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityId: community.id },
        body: { member_id: moderatorAuthorized.id },
      },
    );
  typia.assert(moderatorRecord);
  // Test Execution: Retrieve moderator detail as a guest (no auth)
  const guestConnection: api.IConnection = { host: connection.host };
  const retrieved = await api.functional.community.communities.moderators.at(
    guestConnection,
    {
      communityId: community.id,
      moderatorId: moderatorRecord.id,
    },
  );
  typia.assert(retrieved);
  // Validations
  TestValidator.equals(
    "moderator id matches",
    retrieved.id,
    moderatorRecord.id,
  );
  TestValidator.equals("role is moderator", retrieved.role, "moderator");
  TestValidator.equals(
    "community id matches",
    retrieved.community.id,
    community.id,
  );
  TestValidator.equals(
    "member id matches",
    retrieved.member.id,
    moderatorAuthorized.id,
  );
  TestValidator.equals(
    "member username matches",
    retrieved.member.username,
    moderatorAuthorized.username,
  );
}
