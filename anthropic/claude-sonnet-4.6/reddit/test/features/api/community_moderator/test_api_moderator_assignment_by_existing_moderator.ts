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

export async function test_api_moderator_assignment_by_existing_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register the owner member (connection gets token internally)
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {});
  // 2. Create a community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register the second member (first moderator candidate)
  const firstModeratorConnection: api.IConnection = { host: connection.host };
  const firstModerator = await authorize_member_join(
    firstModeratorConnection,
    {},
  );
  // 4. As the owner, assign the second member as moderator
  const firstModeratorAssignment =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: { member_id: firstModerator.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(firstModeratorAssignment);
  TestValidator.equals(
    "first moderator role",
    firstModeratorAssignment.role,
    "moderator",
  );
  TestValidator.equals(
    "first moderator member id",
    firstModeratorAssignment.member.id,
    firstModerator.id,
  );
  // 5. Register the third member (target for moderator-by-moderator assignment)
  const thirdMemberConnection: api.IConnection = { host: connection.host };
  const thirdMember = await authorize_member_join(thirdMemberConnection, {});
  // 6. As the first moderator (second member), assign the third member as moderator
  //    This validates that existing moderators can expand the moderation team
  const secondModeratorAssignment =
    await generate_random_community_member_communities_moderators_create(
      firstModeratorConnection,
      {
        body: { member_id: thirdMember.id },
        params: { communityId: community.id },
      },
    );
  typia.assert(secondModeratorAssignment);
  // 7. Validate the assignment result
  TestValidator.equals(
    "newly assigned moderator role",
    secondModeratorAssignment.role,
    "moderator",
  );
  TestValidator.equals(
    "newly assigned moderator member id",
    secondModeratorAssignment.member.id,
    thirdMember.id,
  );
  TestValidator.equals(
    "newly assigned moderator community id",
    secondModeratorAssignment.community.id,
    community.id,
  );
}
