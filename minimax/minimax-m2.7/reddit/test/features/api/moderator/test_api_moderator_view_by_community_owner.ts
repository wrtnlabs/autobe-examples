import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";

export async function test_api_moderator_view_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Second member joins
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 3. Owner appoints second member as moderator
  const moderator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { memberUsername: member.username },
      },
    );
  typia.assert(moderator);
  // 4. Owner calls GET /communities/{communityName}/moderators/{moderatorId}
  const moderatorDetails =
    await api.functional.redditClone.communities.moderators.at(
      ownerConnection,
      {
        communityName: community.name,
        moderatorId: moderator.id,
      },
    );
  typia.assert(moderatorDetails);
  // 5. Verify response returns moderator details
  TestValidator.equals(
    "moderator role is moderator",
    moderatorDetails.role,
    "moderator",
  );
  TestValidator.equals(
    "member username matches",
    moderatorDetails.member.username,
    member.username,
  );
  TestValidator.equals(
    "assigner username matches owner",
    moderatorDetails.assigner.username,
    owner.username,
  );
  TestValidator.equals(
    "community name matches",
    moderatorDetails.community.name,
    community.name,
  );
  TestValidator.predicate(
    "has valid created_at",
    moderatorDetails.created_at !== null &&
      moderatorDetails.created_at !== undefined,
  );
  TestValidator.predicate(
    "has valid updated_at",
    moderatorDetails.updated_at !== null &&
      moderatorDetails.updated_at !== undefined,
  );
  TestValidator.equals("deleted_at is null", moderatorDetails.deleted_at, null);
}
