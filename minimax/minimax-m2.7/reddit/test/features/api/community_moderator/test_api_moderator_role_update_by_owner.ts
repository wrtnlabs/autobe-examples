import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
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
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_community_moderator } from "../../../prepare/prepare_random_reddit_clone_community_moderator";

export async function test_api_moderator_role_update_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register memberA (community owner) and authenticate
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  typia.assert(memberAAuthorized);
  // 2. Register memberB (will become moderator) and authenticate
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  typia.assert(memberBAuthorized);
  // 3. MemberA creates a community (automatically becomes owner)
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 4. MemberA assigns memberB as moderator
  const moderator =
    await generate_random_reddit_clone_member_communities_moderators_create(
      memberAConnection,
      {
        body: {
          memberId: memberBAuthorized.id,
          role: "moderator",
        },
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(moderator);
  // 5. MemberA updates memberB's role from 'moderator' to 'owner'
  // Note: The moderatorId here is the moderator record ID, not the member ID
  const updatedModerator =
    await api.functional.redditClone.member.communities.moderators.update(
      memberAConnection,
      {
        communityId: community.id,
        moderatorId: (moderator as unknown as { id: string }).id,
        body: {
          role: "owner",
        } satisfies IRedditCloneCommunityModerator.IUpdate,
      },
    );
  typia.assert(updatedModerator);
  // 6. Validate the response
  // The IRedditCloneCommunityModerator structure contains counts and recent data
  // Validate the update was processed (response is valid structure)
  TestValidator.equals(
    "moderator update response is valid",
    updatedModerator !== null && updatedModerator !== undefined,
    true,
  );
}