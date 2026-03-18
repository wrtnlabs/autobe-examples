import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderator_assignment_create_ineligible_member_rejected(
  connection: api.IConnection,
): Promise<void> {
  const actorConnection: api.IConnection = { host: connection.host };
  // 1) Create a community via the provided generator helper.
  const community: ICommunityPlatformCommunity =
    await generate_random_community_platform_communities_create(
      actorConnection,
      {},
    );
  typia.assert(community);
  // 2) Use a definitely non-existent UUID for moderatorUserId.
  const ineligibleModeratorUserId =
    "00000000-0000-0000-0000-000000000000" satisfies string &
      tags.Format<"uuid">;
  // 3) Attempt to create a moderator assignment and verify it is rejected.
  await TestValidator.httpError(
    "rejects ineligible (non-existent) moderator user id",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.communityModerators.create(
        actorConnection,
        {
          body: {
            communityId: community.id,
            moderatorUserId: ineligibleModeratorUserId,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
  // 4) Repeat to ensure no assignment is created.
  await TestValidator.httpError(
    "still rejects and does not create assignment record",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.communityModerators.create(
        actorConnection,
        {
          body: {
            communityId: community.id,
            moderatorUserId: ineligibleModeratorUserId,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}
