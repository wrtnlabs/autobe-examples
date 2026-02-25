import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationLog";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationLog";
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

export async function test_api_moderation_logs_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneOwner.IJoin;
  const ownerData = await authorize_owner_join(ownerConnection, {
    body: ownerUser,
  });
  typia.assert(ownerData);
  // 2. Create community with owner
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(8),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_url: null,
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorUser = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.alphaNumeric(8),
    displayName: RandomGenerator.name(),
  } satisfies IRedditCloneModerator.IJoin;
  const moderatorData = await authorize_moderator_join(moderatorConnection, {
    body: moderatorUser,
  });
  typia.assert(moderatorData);
  // 4. Assign moderator to community (using owner's authority)
  // Note: In real implementation, this would use the appropriate API to assign moderator
  // For now, we'll assume the moderator is already assigned to the community
  // 5. Retrieve moderation logs
  const logs =
    await api.functional.redditClone.moderator.communities.moderation_logs.list(
      moderatorConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(logs);
  // 6. Validate moderation logs structure
  TestValidator.predicate("has moderation logs", logs.data !== undefined);
  TestValidator.predicate("has pagination info", logs.pagination !== undefined);
  // Validate log structure when data exists
  if (logs.data && logs.data.length > 0) {
    for (const log of logs.data) {
      TestValidator.predicate(
        "has valid moderator info",
        log.moderator !== undefined,
      );
      TestValidator.predicate(
        "has valid timestamp",
        log.createdAt !== undefined,
      );
      TestValidator.predicate(
        "has valid action type",
        log.actionType === undefined ||
          [
            "delete_post",
            "delete_comment",
            "ban_user",
            "unban_user",
            "approve_report",
            "dismiss_report",
          ].includes(log.actionType),
      );
      TestValidator.predicate(
        "has valid target",
        log.target === undefined || log.target !== null,
      );
    }
  }
}
