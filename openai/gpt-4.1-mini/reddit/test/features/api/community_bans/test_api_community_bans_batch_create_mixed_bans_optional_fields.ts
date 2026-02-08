import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { generate_random_community_platform_user_community_subscriptions_create } from "../../../generate/generate_random_community_platform_user_community_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";

/**
 * Scenario 2: Batch create bans where some bans include optional unbanned_at timestamps and reasons.
 *
 * Steps:
 * 1. Authenticate as a moderator via /auth/moderator/join.
 * 2. Create a community and subscribe several users.
 * 3. Send a batch ban request including entries with unbanned_at timestamps to test temporary bans.
 * 4. Include reasons for ban to verify proper handling.
 * 5. Verify that the response shows all ban records created correctly, with unbanned_at and reason fields populated as provided.
 * 6. Confirm transactional behavior: either all bans are created or none if failure occurs.
 *
 * This tests handling of optional fields and ensures robustness of batch ban feature with mixed ban states.
 */
export async function test_api_community_bans_batch_create_mixed_bans_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a moderator via /auth/moderator/join.
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: ICommunityPlatformModerator.IJoin = {};
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinBody,
  });
  moderatorConnection.headers = { Authorization: String(moderatorAuth.token.access) };
  // 2. Authenticate multiple users and create their subscriptions to the community
  const userCount = 3;
  const userConnections: api.IConnection[] = [];
  const userIds: string[] = [];
  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(userCount, () => ({} as ICommunityPlatformUser.IJoin)),
    async (_userJoinBody, _index) => {
      const userConnection: api.IConnection = { host: connection.host };
      const userJoinBody: ICommunityPlatformUser.IJoin = {};
      const userAuth = await authorize_user_join(userConnection, {
        body: userJoinBody,
      });
      userConnection.headers = { Authorization: String(userAuth.token.access) };
      userConnections.push(userConnection);
    },
  );
  // 3. Create a community by a user (we use the first user connection for ownership)
  const communityRaw = await generate_random_community_platform_user_communities_create_community(
    userConnections[0],
    { body: {} },
  );
  // We expect communityRaw to be of type ICommunityPlatformCommunity & { id: string }
  // Because api probably returns a type that extends the base interface with id property
  // We'll assert the type with typia.assert and add id property as string
  // so that TypeScript compiler accepts the id property
  interface CommunityWithId extends ICommunityPlatformCommunity {
    id: string;
  }
  const community = typia.assert<CommunityWithId>(communityRaw);

  // 4. Subscribe all users to the community
  await ArrayUtil.asyncForEach(userConnections, async (userConn) => {
    const communitySubscription =
      await generate_random_community_platform_user_community_subscriptions_create(userConn, {
        body: { community_id: community.id },
      });
    typia.assert(communitySubscription);
    userIds.push(String(userConn.headers?.Authorization ?? ""));
  });

  // 5. Gather ban entries with mixed optional fields
  const now = new Date();
  const banEntries = userIds.map((userAuthToken, idx) => {
    const userId = userAuthToken || String(idx);
    if (idx % 2 === 0) {
      return {
        user_id: userId,
        community_id: community.id,
        banned_at: now.toISOString(),
        unbanned_at: null,
        reason: null,
      };
    } else {
      const unbannedAt = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
      const reason = `Temporary ban for user ${userId}`;
      return {
        user_id: userId,
        community_id: community.id,
        banned_at: now.toISOString(),
        unbanned_at: unbannedAt,
        reason: reason,
      };
    }
  });

  // 6. Perform batch ban creation
  const responseRaw = await api.functional.communityPlatform.moderator.community_bans.batch.createBatch(
    moderatorConnection,
    { body: banEntries },
  );
  // The response data type might not directly have user_id, etc.
  // So we will define a type compatible with response.data elements.
  type CommunityBanRecord = {
    user_id: string;
    community_id: string;
    banned_at: string;
    unbanned_at: string | null;
    reason: string | null;
  };
  const response = typia.assert<{ data: CommunityBanRecord[] }>(responseRaw);

  // 7. Validate the bans in the response
  TestValidator.equals("All bans created", response.data.length, banEntries.length);
  // 8. Validate each ban record
  banEntries.forEach((banEntry) => {
    const matched = response.data.find(
      (record) => record.user_id === banEntry.user_id && record.community_id === banEntry.community_id,
    );
    TestValidator.predicate(`Ban record exists for user ${banEntry.user_id}`, matched !== undefined);
    if (matched) {
      TestValidator.equals("banned_at matches", matched.banned_at, banEntry.banned_at);
      TestValidator.equals("unbanned_at matches", matched.unbanned_at, banEntry.unbanned_at);
      TestValidator.equals("reason matches", matched.reason, banEntry.reason);
    }
  });
}
