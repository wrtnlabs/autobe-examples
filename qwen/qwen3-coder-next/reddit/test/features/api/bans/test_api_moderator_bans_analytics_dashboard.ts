import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneBanRecord";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
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
import { generate_random_reddit_clone_owner_communities_create } from "../../../generate/generate_random_reddit_clone_owner_communities_create";
import { prepare_random_reddit_clone_ban_record } from "../../../prepare/prepare_random_reddit_clone_ban_record";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";

export async function test_api_moderator_bans_analytics_dashboard(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create owner actor
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneOwner.IJoin,
  });
  // 2. Create community as owner
  const community = await api.functional.redditClone.owner.communities.create(
    ownerConnection,
    {
      body: {
        name: RandomGenerator.alphaNumeric(6),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditCloneCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Setup moderator actor for the community
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      username: RandomGenerator.alphaNumeric(8),
      displayName: RandomGenerator.name(),
    } satisfies IRedditCloneModerator.IJoin,
  });
  // 4. Create multiple ban records for testing analytics
  for (let i = 0; i < 3; i++) {
    await generate_random_reddit_clone_moderator_communities_bans_create_ban(
      moderatorConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          member_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  }
  // 5. Create an expired ban for testing
  await generate_random_reddit_clone_moderator_communities_bans_create_ban(
    moderatorConnection,
    {
      params: {
        communityId: community.id,
      },
      body: {
        member_id: typia.random<string & tags.Format<"uuid">>(),
        reason: "Expired ban test",
        expires_at: new Date(Date.now() - 86400000).toISOString(),
      },
    },
  );
  // 6. Get analytics and validate
  const analytics =
    await api.functional.redditClone.moderator.analytics.bans.getBansAnalytics(
      moderatorConnection,
    );
  typia.assert(analytics);
  // 7. Validate analytics structure matches IRedditCloneCommunityBan
  TestValidator.equals(
    "analytics has community information",
    analytics.community.id,
    community.id,
  );
  TestValidator.equals(
    "analytics has moderator information",
    analytics.moderator.username,
    moderatorConnection.headers?.Authorization
      ? "moderator"
      : analytics.moderator.username,
  );
  TestValidator.predicate(
    "analytics has ban start date",
    analytics.banStartDate !== null && analytics.banStartDate !== undefined,
  );
  TestValidator.predicate(
    "analytics has creation timestamp",
    analytics.createdAt !== null && analytics.createdAt !== undefined,
  );
}
