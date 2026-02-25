import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_communities_bans_ban_user } from "../../../generate/generate_random_reddit_clone_communities_bans_ban_user";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { generate_random_reddit_clone_owner_communities_moderators_add_moderator } from "../../../generate/generate_random_reddit_clone_owner_communities_moderators_add_moderator";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_moderator_assignment } from "../../../prepare/prepare_random_reddit_clone_moderator_assignment";

export async function test_api_community_ban_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account and authenticate
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
  } satisfies DeepPartial<IRedditCloneOwner.IJoin>;
  await authorize_owner_join(ownerConnection, { body: ownerUser });
  // 2. Create a community as owner
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
  } satisfies DeepPartial<IRedditCloneModerator.IJoin>;
  await authorize_moderator_join(moderatorConnection, { body: moderatorUser });
  // 4. Appoint moderator to community (requires owner authentication)
  const moderatorAssignment =
    await api.functional.redditClone.owner.communities.moderators.addModerator(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          appointedActorId: moderatorUser.username,
          appointingActorId: ownerUser.username,
          communityId: community.id,
          role: "moderator" as const,
        } satisfies IRedditCloneModeratorAssignment.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Create member account to be banned and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const memberUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(),
    displayName: null,
  } satisfies DeepPartial<IRedditCloneMember.IJoin>;
  await authorize_member_join(memberConnection, { body: memberUser });
  // 6. Ban the member using the moderator connection
  const banRecord = await api.functional.redditClone.communities.bans.banUser(
    moderatorConnection,
    {
      communityId: community.id,
      body: {
        member_id: memberUser.username,
        reason: RandomGenerator.paragraph({ sentences: 1 }),
        expires_at: null,
      } satisfies IRedditCloneBanRecord.ICreate,
    },
  );
  typia.assert(banRecord);
  // 7. Verify the ban record
  TestValidator.equals(
    "member_id matches",
    banRecord.member.id,
    memberUser.username,
  );
  TestValidator.equals(
    "moderator_id matches",
    banRecord.moderator.id,
    moderatorUser.username,
  );
  TestValidator.equals(
    "community_id matches",
    banRecord.community.id,
    community.id,
  );
}
