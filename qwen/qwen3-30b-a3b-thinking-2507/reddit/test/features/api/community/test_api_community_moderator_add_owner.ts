import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
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

export async function test_api_community_moderator_add_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register community member (owner)
  const userAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(userAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  // 2. Create community as the owner
  const community = await generate_random_community_member_communities_create(
    userAConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 1 }),
      },
    },
  );
  // 3. Register second community member (new owner)
  const userBConnection: api.IConnection = { host: connection.host };
  const userBResult = await authorize_member_join(userBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
    },
  });
  // 4. Add new owner to the community
  const moderator =
    await generate_random_community_member_communities_moderators_create(
      userAConnection,
      {
        body: {
          user_id: userBResult.id,
          community_id: community.id,
          is_owner: true,
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. Validate owner privilege assignment
  TestValidator.equals("is_owner should be true", moderator.is_owner, true);
}
