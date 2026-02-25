import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_member_unban_user_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create owner user and community
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphabets(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 2. Setup: Create moderator user
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 3. Setup: Ban a user from the community (moderator bans)
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  await api.functional.redditClone.moderator.communities.bans.erase(
    ownerConnection,
    {
      communityId: community.id,
      userId: bannedUserId,
    },
  );
  // 4. Attempt: Member (non-moderator) tries to unban the user
  await TestValidator.error(
    "member unauthorized unban should fail",
    async () => {
      await api.functional.redditClone.moderator.communities.bans.erase(
        connection,
        {
          communityId: community.id,
          userId: bannedUserId,
        },
      );
    },
  );
}
