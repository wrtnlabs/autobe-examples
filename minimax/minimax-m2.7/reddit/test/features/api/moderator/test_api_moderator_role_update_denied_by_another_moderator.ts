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

export async function test_api_moderator_role_update_denied_by_another_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register memberA (owner), memberB (moderator), memberC (moderator)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberAAuthorized = await authorize_member_join(memberAConnection, {});
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBAuthorized = await authorize_member_join(memberBConnection, {});
  const memberCConnection: api.IConnection = { host: connection.host };
  const memberCAuthorized = await authorize_member_join(memberCConnection, {});
  // 2. Create community with memberA as owner
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // 3. Assign memberB as moderator
  const moderatorB =
    await generate_random_reddit_clone_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(moderatorB);
  // 4. Assign memberC as moderator
  const moderatorC =
    await generate_random_reddit_clone_member_communities_moderators_create(
      memberAConnection,
      {
        params: { communityId: community.id },
        body: {
          memberId: memberCAuthorized.id,
          role: "moderator",
        },
      },
    );
  typia.assert(moderatorC);
  // 5. Attempt to update memberC's role while authenticated as memberB
  // Moderators cannot modify other moderators' roles - only owner has this authority
  await TestValidator.httpError(
    "moderator cannot modify another moderator's role",
    403,
    async () =>
      await api.functional.redditClone.member.communities.moderators.update(
        memberBConnection,
        {
          communityId: community.id,
          moderatorId: memberCAuthorized.id,
          body: {
            role: "moderator",
          } satisfies IRedditCloneCommunityModerator.IUpdate,
        },
      ),
  );
}