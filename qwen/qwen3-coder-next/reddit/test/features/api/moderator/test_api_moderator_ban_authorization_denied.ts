import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationAppeal";
import type { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
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
import { generate_random_reddit_clone_moderator_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create_ban";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";

export async function test_api_moderator_ban_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create two separate moderators: one authorized (moderatorA) and one unauthorized (moderatorB)
  const moderatorAConnection: api.IConnection = { host: connection.host };
  const moderatorA = await authorize_moderator_join(moderatorAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorA);
  const moderatorBConnection: api.IConnection = { host: connection.host };
  const moderatorB = await authorize_moderator_join(moderatorBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorB);
  // 2. Generate a random community ID to test ban authorization
  const randomCommunityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Prepare ban creation request
  const banRequest: IRedditCloneBanRecord.ICreate = {
    member_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 1 }),
  };
  // 4. moderatorB attempts to ban a user from a community (where moderatorB has no permissions)
  // This should fail due to lack of authorization
  await TestValidator.error(
    "moderatorB cannot ban from community (not assigned as moderator)",
    async () => {
      await api.functional.redditClone.moderator.communities.bans.createBan(
        moderatorBConnection,
        {
          communityId: randomCommunityId,
          body: banRequest,
        },
      );
    },
  );
  // 5. Verify moderatorA (authorized) CAN ban successfully on the same community
  const banRecord =
    await api.functional.redditClone.moderator.communities.bans.createBan(
      moderatorAConnection,
      {
        communityId: randomCommunityId,
        body: banRequest,
      },
    );
  typia.assert(banRecord);
  TestValidator.equals("ban created", banRecord.is_active, true);
  TestValidator.equals("moderator is A", banRecord.moderator.id, moderatorA.id);
}
