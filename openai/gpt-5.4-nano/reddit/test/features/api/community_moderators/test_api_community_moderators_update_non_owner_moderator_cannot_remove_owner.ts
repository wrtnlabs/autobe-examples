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

export async function test_api_community_moderators_update_non_owner_moderator_cannot_remove_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1) Owner creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community = await generate_random_community_platform_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  const communityId = community.id;
  const ownerMemberId = community.owner.id;
  // 2) Moderator candidate joins as a member
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(moderatorAuth);
  const moderatorCandidateMemberId = moderatorAuth.id;
  // 3) Owner adds candidate as moderator
  await api.functional.communityPlatform.communityModerators.update(
    ownerConnection,
    {
      body: {
        communityId,
        operation: "add",
        targetMemberIds: [moderatorCandidateMemberId],
      } satisfies ICommunityPlatformCommunityModerator.IRequest,
    },
  );
  // 4) Candidate tries to remove community owner
  const tryRemoveOwner = async (): Promise<void> => {
    await api.functional.communityPlatform.communityModerators.update(
      moderatorConnection,
      {
        body: {
          communityId,
          operation: "remove",
          targetMemberIds: [ownerMemberId],
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  };
  await TestValidator.error(
    "non-owner moderator cannot remove community owner",
    tryRemoveOwner,
  );
  // 5) Verify candidate moderator assignment remains active
  const updated =
    await api.functional.communityPlatform.communityModerators.update(
      ownerConnection,
      {
        body: {
          communityId,
          operation: "add",
          targetMemberIds: [moderatorCandidateMemberId],
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "candidate moderator id unchanged",
    updated.moderator.id,
    moderatorCandidateMemberId,
  );
}
