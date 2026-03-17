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

export async function test_api_moderator_removal_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register owner member account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerAuth);
  // Step 2: Create a new community using owner's connection
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // Step 3: Register a second member (the moderator-to-be)
  const moderatorMemberConnection: api.IConnection = { host: connection.host };
  const moderatorMemberAuth = await authorize_member_join(
    moderatorMemberConnection,
    {},
  );
  typia.assert(moderatorMemberAuth);
  // Step 4: Assign the second member as moderator using owner's connection
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: moderatorMemberAuth.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderatorRecord);
  // Validate moderator assignment details
  TestValidator.equals("moderator role", moderatorRecord.role, "moderator");
  TestValidator.equals(
    "moderator member id",
    moderatorRecord.member.id,
    moderatorMemberAuth.id,
  );
  TestValidator.equals(
    "moderator community id",
    moderatorRecord.community.id,
    community.id,
  );
  // Test execution: Remove the moderator role using owner's connection
  await api.functional.community.member.communities.moderators.erase(
    ownerConnection,
    {
      communityId: community.id,
      moderatorId: moderatorRecord.id,
    },
  );
}
