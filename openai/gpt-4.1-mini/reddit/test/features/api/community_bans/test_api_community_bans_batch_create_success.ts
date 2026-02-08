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

export async function test_api_community_bans_batch_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorJoinConnection, {
    body: {},
  });
  typia.assert(moderator);
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // 2. Create multiple users
  const userCount = 3;
  const userAuths: {
    authorized: ICommunityPlatformUser.IAuthorized;
    connection: api.IConnection;
    userId: string;
  }[] = [];
  for (let i = 0; i < userCount; i++) {
    const userJoinConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_user_join(userJoinConnection, {
      body: {},
    });
    typia.assert(authorized);
    const userConnection: api.IConnection = { host: connection.host };
    userConnection.headers = { Authorization: authorized.token.access };
    userAuths.push({ authorized, connection: userConnection, userId: "" });
  }
  // 3. Use one user to create a community
  const creator = userAuths[0];
  const communityWrapper =
    await generate_random_community_platform_user_communities_create_community(
      creator.connection,
      { body: {} },
    );
  typia.assert(communityWrapper);
  // 'id' property is assumed on community entities as IEntity
  const communityId: string = (communityWrapper as any).id ?? "";
  // 4. Subscribe all users to the community and get their subscription info
  for (const userAuth of userAuths) {
    const subscriptionWrapper =
      await generate_random_community_platform_user_community_subscriptions_create(
        userAuth.connection,
        { body: { community_id: communityId } },
      );
    typia.assert(subscriptionWrapper);
    // 'user_id' assumed to exist on subscription
    const userId: string = (subscriptionWrapper as any).user_id ?? "";
    // Validate community id on subscription if exists
    TestValidator.equals(
      "subscription community_id",
      (subscriptionWrapper as any).community_id ?? communityId,
      communityId,
    );
    userAuth.userId = userId;
  }
  // 5. Prepare batch create body for bans as array directly
  const now = new Date();
  const banBatchBody = userAuths.map(({ userId }) => ({
    user_id: userId,
    community_id: communityId,
    banned_at: now.toISOString(),
    reason: "Violation of community rules",
  }));
  // 6. Call batch create bans endpoint
  const banBatchResponse =
    await api.functional.communityPlatform.moderator.community_bans.batch.createBatch(
      moderatorConnection,
      { body: banBatchBody },
    );
  typia.assert(banBatchResponse);
  // 7. Validate response
  TestValidator.equals(
    "ban batch record count",
    banBatchResponse.data.length,
    banBatchBody.length,
  );
  for (const ban of banBatchResponse.data) {
    typia.assert(ban);
    TestValidator.predicate(
      "ban record has id",
      typeof (ban as any).id === "string" && (ban as any).id.length > 0,
    );
    TestValidator.equals(
      "ban record community_id",
      (ban as any).community_id ?? (ban as any).communityId ?? "",
      communityId,
    );
    TestValidator.predicate(
      "ban record user_id in ban batch",
      banBatchBody.some((b) => b.user_id === (ban as any).user_id),
    );
    TestValidator.predicate(
      "ban record has banned_at",
      typeof (ban as any).banned_at === "string" &&
        (ban as any).banned_at.length > 0,
    );
    TestValidator.predicate(
      "ban record reason matches",
      banBatchBody.find((b) => b.user_id === (ban as any).user_id)?.reason ===
        (ban as any).reason,
    );
  }
}
