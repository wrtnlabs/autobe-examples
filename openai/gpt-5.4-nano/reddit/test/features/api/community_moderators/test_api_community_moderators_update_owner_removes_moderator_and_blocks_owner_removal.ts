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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_community_moderators_update_owner_removes_moderator_and_blocks_owner_removal(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_member_join(ownerConnection, {});
  const ownerMemberId = ownerAuthorized.id;
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_member_join(
    moderatorConnection,
    {},
  );
  const removableModeratorMemberId = moderatorAuthorized.id;

  const addModeratorSummary =
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          operation: "add",
          targetMemberIds: [removableModeratorMemberId],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );

  typia.assert(addModeratorSummary);
  await TestValidator.predicate(
    "moderator added (matches targetMemberId)",
    () => addModeratorSummary.moderator.id === removableModeratorMemberId,
  );

  const removeModeratorSummary =
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          operation: "remove",
          targetMemberIds: [removableModeratorMemberId],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );

  typia.assert(removeModeratorSummary);
  await TestValidator.predicate(
    "moderator removed (not equal to removed moderator id)",
    () => removeModeratorSummary.moderator.id !== removableModeratorMemberId,
  );

  await TestValidator.error("cannot remove community owner", async () => {
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          operation: "remove",
          targetMemberIds: [ownerMemberId],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  });

  const finalModeratorSummary =
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: {
          communityId: community.id,
          operation: "remove",
          targetMemberIds: [removableModeratorMemberId],
          page: null,
          limit: null,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );

  typia.assert(finalModeratorSummary);
  await TestValidator.predicate(
    "previous moderator remains removed after forbidden action",
    () => finalModeratorSummary.moderator.id !== removableModeratorMemberId,
  );
}
