import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderators_get_by_id_soft_deleted_assignment(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const moderatorCandidate = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const moderatorAssignment =
    await generate_random_community_platform_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: moderatorCandidate.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  const communityModeratorId = moderatorAssignment.id;
  const softDeletedAt = RandomGenerator.date(
    new Date(),
    1000 * 60 * 60,
  ).toISOString();
  const softDeletedAssignment =
    await api.functional.communityPlatform.communityModerators.updateCommunityModerator(
      adminConnection,
      {
        communityModeratorId,
        body: {
          deleted_at: softDeletedAt,
        } satisfies ICommunityPlatformCommunityModerator.IUpdate,
      },
    );
  typia.assert(softDeletedAssignment);
  const retrieved =
    await api.functional.communityPlatform.communityModerators.at(
      adminConnection,
      {
        communityModeratorId,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "assignment id matches",
    retrieved.id,
    moderatorAssignment.id,
  );
  TestValidator.equals(
    "community id matches",
    retrieved.community_id,
    moderatorAssignment.community_id,
  );
  TestValidator.equals(
    "moderator user id matches",
    retrieved.moderator_user_id,
    moderatorAssignment.moderator_user_id,
  );
  TestValidator.equals(
    "deleted_at is soft deleted",
    retrieved.deleted_at,
    softDeletedAt,
  );
  await api.functional.communityPlatform.communityModerators.updateCommunityModerator(
    adminConnection,
    {
      communityModeratorId,
      body: {
        deleted_at: null,
      } satisfies ICommunityPlatformCommunityModerator.IUpdate,
    },
  );
  const retrievedAfterReenable =
    await api.functional.communityPlatform.communityModerators.at(
      adminConnection,
      {
        communityModeratorId,
      },
    );
  typia.assert(retrievedAfterReenable);
  TestValidator.equals(
    "deleted_at cleared after re-enable",
    retrievedAfterReenable.deleted_at,
    null,
  );
}
