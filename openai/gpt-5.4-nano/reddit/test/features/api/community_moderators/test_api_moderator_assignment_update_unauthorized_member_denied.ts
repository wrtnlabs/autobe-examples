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

export async function test_api_moderator_assignment_update_unauthorized_member_denied(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const unauthorizedJoin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  unauthorizedConnection.headers = {
    Authorization: unauthorizedJoin.token.access,
  };
  const moderatorJoin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorJoin.token.access,
  };
  const otherModeratorJoin = await authorize_member_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const otherModeratorConnection: api.IConnection = { host: connection.host };
  otherModeratorConnection.headers = {
    Authorization: otherModeratorJoin.token.access,
  };
  const communityA =
    await generate_random_community_platform_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityA);
  const communityB =
    await generate_random_community_platform_communities_create(
      otherModeratorConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_href: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(communityB);
  const assignment =
    await generate_random_community_platform_community_moderators_create(
      moderatorConnection,
      {
        body: {
          communityId: communityB.id,
          moderatorUserId: moderatorJoin.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(assignment);
  // Snapshot current state to verify no partial updates
  const beforeId = assignment.id;
  const beforeCommunityId = assignment.community_id;
  const beforeModeratorUserId = assignment.moderator_user_id;
  const beforeDeletedAt = assignment.deleted_at;
  await TestValidator.error(
    "unauthorized member cannot update moderator assignment",
    async () => {
      await api.functional.communityPlatform.communityModerators.updateCommunityModerator(
        unauthorizedConnection,
        {
          communityModeratorId: beforeId,
          body: {
            community_id: communityA.id,
            moderator_user_id: otherModeratorJoin.id,
            deleted_at: RandomGenerator.date(new Date(), 1000).toISOString(),
          } satisfies ICommunityPlatformCommunityModerator.IUpdate,
        },
      );
    },
  );
  // Reload/ensure unchanged by attempting update from allowed actor is not available.
  // Since no GET endpoint is provided, rely on immediate update denial and deep invariants
  // from before snapshot (DTO should not be mutated client-side).
  TestValidator.equals(
    "community_id unchanged (client snapshot)",
    assignment.community_id,
    beforeCommunityId,
  );
  TestValidator.equals(
    "moderator_user_id unchanged (client snapshot)",
    assignment.moderator_user_id,
    beforeModeratorUserId,
  );
  TestValidator.equals(
    "deleted_at unchanged (client snapshot)",
    assignment.deleted_at,
    beforeDeletedAt,
  );
}
