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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create_ban } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create_ban";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";

export async function test_api_moderator_ban_user_from_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create connections for different actors
  const ownerConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // 2. Create owner and moderator accounts using utility functions
  const ownerAccount = await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  typia.assert(ownerAccount);
  const moderatorAccount = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderatorAccount);
  // 3. Create a user to ban using the available auth member endpoint
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAccount = await authorize_moderator_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(memberAccount);
  // 4. Ban the user from a community
  const banRecord =
    await api.functional.redditClone.moderator.communities.bans.createBan(
      moderatorConnection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          member_id: memberAccount.id,
          reason: "Violation of community guidelines - spamming",
          expires_at: null,
        } satisfies IRedditCloneBanRecord.ICreate,
      },
    );
  typia.assert(banRecord);
  // 5. Validate ban record
  TestValidator.predicate(
    "ban record has required fields",
    banRecord.id !== undefined &&
      banRecord.community_id !== undefined &&
      banRecord.member_id !== undefined &&
      banRecord.moderator_id !== undefined &&
      banRecord.created_at !== undefined &&
      banRecord.reason !== undefined &&
      banRecord.is_active === true,
  );
}
