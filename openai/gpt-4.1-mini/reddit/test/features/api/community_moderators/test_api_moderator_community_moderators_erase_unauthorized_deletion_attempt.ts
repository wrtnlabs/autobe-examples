import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_moderator_community_moderators_create } from "../../../generate/generate_random_community_platform_moderator_community_moderators_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_moderator_community_moderators_erase_unauthorized_deletion_attempt(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator A join and login
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorAJoin = await authorize_moderator_join(moderatorAConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(moderatorAJoin);
  // 2. Moderator B join and login
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorBJoin = await authorize_moderator_join(moderatorBConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(moderatorBJoin);
  // 3. User join (regular user who creates community)
  const userConnection: api.IConnection = { host: connection.host };
  const userJoin = await authorize_user_join(userConnection, {});
  typia.assert(userJoin);
  // 4. User creates community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {},
    );
  typia.assert(community);
  // Extract id property assuming the returned object has id
  const communityId = (
    community as unknown as {
      id: string;
    }
  ).id;
  // 5. Assign moderator A as moderator of the community
  const moderatorAAssignment =
    await generate_random_community_platform_moderator_community_moderators_create(
      moderatorAConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAAssignment);
  // Extract id property
  const moderatorAAssignmentId = (
    moderatorAAssignment as unknown as {
      id: string;
    }
  ).id;
  // 6. Assign moderator B as moderator of the community
  const moderatorBAssignment =
    await generate_random_community_platform_moderator_community_moderators_create(
      moderatorBConnection,
      {
        body: {
          communityId: communityId,
          communityModeratorId: typia.random<string & tags.Format<"uuid">>(),
          role: "moderator",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorBAssignment);
  // 7. Moderator B attempts unauthorized deletion of moderator A assignment
  await TestValidator.httpError(
    "Unauthorized moderator deletion attempt",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communityModerators.erase(
        moderatorBConnection,
        { communityModeratorId: moderatorAAssignmentId },
      );
    },
  );
}
