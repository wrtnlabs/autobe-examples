import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_refresh_multiple_times(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a community moderator to establish session
  const moderatorConnection: api.IConnection = { host: connection.host };
  const initialAuth: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16)
          .replace(/[^0-9]/, "1")
          .replace(/[^!@#$%^&*]/, "!"),
        username: RandomGenerator.name(1),
      },
    });
  typia.assert(initialAuth);
  // 2. Verify initial access token and refresh token exist
  TestValidator.predicate(
    "initial access token exists",
    () => initialAuth.access_token.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token exists",
    () => initialAuth.token.refresh.length > 0,
  );
  // 3. First refresh operation
  const refreshConnection1: api.IConnection = { host: connection.host };
  refreshConnection1.headers = { Authorization: initialAuth.access_token };
  const refreshed1: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_refresh(refreshConnection1, {
      body: {},
    });
  typia.assert(refreshed1);
  // 4. Validate first refresh: access token changed, refresh token unchanged, profile unchanged
  TestValidator.notEquals(
    "access token different after first refresh",
    initialAuth.access_token,
    refreshed1.access_token,
  );
  TestValidator.equals(
    "refresh token unchanged after first refresh",
    initialAuth.token.refresh,
    refreshed1.token.refresh,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.id,
    refreshed1.id,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.email,
    refreshed1.email,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.username,
    refreshed1.username,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.display_name,
    refreshed1.display_name,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.avatar_url,
    refreshed1.avatar_url,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.karma_score,
    refreshed1.karma_score,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.created_at,
    refreshed1.created_at,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.updated_at,
    refreshed1.updated_at,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community_id,
    refreshed1.community_id,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.id,
    refreshed1.user.id,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.username,
    refreshed1.user.username,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.display_name,
    refreshed1.user.display_name,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.bio,
    refreshed1.user.bio,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.avatar_url,
    refreshed1.user.avatar_url,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.karma_score,
    refreshed1.user.karma_score,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.user.created_at,
    refreshed1.user.created_at,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.id,
    refreshed1.community.id,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.name,
    refreshed1.community.name,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.description,
    refreshed1.community.description,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.icon_url,
    refreshed1.community.icon_url,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.subscriber_count,
    refreshed1.community.subscriber_count,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.created_at,
    refreshed1.community.created_at,
  );
  TestValidator.equals(
    "profile unchanged after first refresh",
    initialAuth.community.updated_at,
    refreshed1.community.updated_at,
  );
  TestValidator.predicate(
    "new refresh token expiration is set",
    () => refreshed1.token.expired_at > initialAuth.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until unchanged",
    () =>
      refreshed1.token.refreshable_until ===
      initialAuth.token.refreshable_until,
  );
  // 5. Second refresh operation
  const refreshConnection2: api.IConnection = { host: connection.host };
  refreshConnection2.headers = { Authorization: refreshed1.access_token };
  const refreshed2: IRedditCommunityCommunityModerator.IAuthorized =
    await authorize_community_moderator_refresh(refreshConnection2, {
      body: {},
    });
  typia.assert(refreshed2);
  // 6. Validate second refresh: access token changed again, refresh token still unchanged, profile unchanged
  TestValidator.notEquals(
    "access token different after second refresh",
    refreshed1.access_token,
    refreshed2.access_token,
  );
  TestValidator.equals(
    "refresh token unchanged after second refresh",
    refreshed1.token.refresh,
    refreshed2.token.refresh,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.id,
    refreshed2.id,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.email,
    refreshed2.email,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.username,
    refreshed2.username,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.display_name,
    refreshed2.display_name,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.avatar_url,
    refreshed2.avatar_url,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.karma_score,
    refreshed2.karma_score,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.created_at,
    refreshed2.created_at,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.updated_at,
    refreshed2.updated_at,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community_id,
    refreshed2.community_id,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.id,
    refreshed2.user.id,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.username,
    refreshed2.user.username,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.display_name,
    refreshed2.user.display_name,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.bio,
    refreshed2.user.bio,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.avatar_url,
    refreshed2.user.avatar_url,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.karma_score,
    refreshed2.user.karma_score,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.user.created_at,
    refreshed2.user.created_at,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.id,
    refreshed2.community.id,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.name,
    refreshed2.community.name,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.description,
    refreshed2.community.description,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.icon_url,
    refreshed2.community.icon_url,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.subscriber_count,
    refreshed2.community.subscriber_count,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.created_at,
    refreshed2.community.created_at,
  );
  TestValidator.equals(
    "profile unchanged after second refresh",
    refreshed1.community.updated_at,
    refreshed2.community.updated_at,
  );
  TestValidator.predicate(
    "another new refresh token expiration is set",
    () => refreshed2.token.expired_at > refreshed1.token.expired_at,
  );
  TestValidator.predicate(
    "refreshable_until still unchanged",
    () =>
      refreshed2.token.refreshable_until === refreshed1.token.refreshable_until,
  );
  // 7. Ensure the original refresh token is still valid
  const verifyConnection: api.IConnection = { host: connection.host };
  verifyConnection.headers = { Authorization: initialAuth.access_token };
  try {
    await authorize_community_moderator_refresh(verifyConnection, {
      body: {},
    });
    TestValidator.error(
      "original access token should be invalid after refresh",
      () => {},
    );
  } catch (err) {
    // Expected: original access token should be revoked
    TestValidator.equals(
      "original access token revoked with 401",
      (err as any).status,
      401,
    );
  }
}
