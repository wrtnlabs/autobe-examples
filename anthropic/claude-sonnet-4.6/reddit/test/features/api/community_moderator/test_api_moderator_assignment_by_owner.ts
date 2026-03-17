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

export async function test_api_moderator_assignment_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register owner member and get authenticated connection
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerMember = await authorize_member_join(ownerConnection, {});
  // ownerConnection.headers is now set with Authorization token
  // 2. Create a community as the owner
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Register a second member (target for moderator role)
  const targetConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(targetConnection, {});
  // targetMember.id is the UUID we need to assign as moderator
  // 4. As owner, assign the second member as a moderator
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        body: {
          member_id: targetMember.id,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. Validate the moderator record
  TestValidator.equals(
    "moderator role must be 'moderator'",
    moderator.role,
    "moderator",
  );
  TestValidator.equals(
    "moderator member.id matches target",
    moderator.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "moderator community.id matches created community",
    moderator.community.id,
    community.id,
  );
  // 6. Edge case: Duplicate assignment should result in error (409 Conflict)
  await TestValidator.error(
    "duplicate moderator assignment should fail",
    async () => {
      await generate_random_community_member_communities_moderators_create(
        ownerConnection,
        {
          body: {
            member_id: targetMember.id,
          },
          params: {
            communityId: community.id,
          },
        },
      );
    },
  );
}
