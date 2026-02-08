import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformBannedUser";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_banned_users_create } from "../../../generate/generate_random_community_platform_moderator_banned_users_create";
import { prepare_random_community_platform_banned_user } from "../../../prepare/prepare_random_community_platform_banned_user";

/**
 * Test creating a new ban record for a user in a community by an authorized moderator.
 * This test verifies that authorization is required, valid UUIDs are accepted, the ban reason is mandatory,
 * and duplicate bans are rejected with proper errors. It asserts the ban record structure after creation.
 */
export async function test_api_community_platform_moderator_banned_user_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join and authorize
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorConnection,
    {
      body: {} satisfies ICommunityPlatformModerator.IJoin,
    },
  );
  typia.assert(authorizedModerator);
  moderatorConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  // 2. Create a first ban record with valid mandatory data
  const communityPlatformUserId = typia.random<string & tags.Format<"uuid">>();
  const communityPlatformCommunityId = typia.random<
    string & tags.Format<"uuid">
  >();
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const bannedAt = new Date().toISOString();
  const unbannedAt: null = null;
  const banCreateBody1 = {
    community_platform_user_id: communityPlatformUserId,
    community_platform_community_id: communityPlatformCommunityId,
    reason: banReason,
    banned_at: bannedAt,
    unbanned_at: unbannedAt,
  } satisfies Parameters<
    typeof generate_random_community_platform_moderator_banned_users_create
  >[1]["body"];
  const banRecord1 =
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      { body: banCreateBody1 },
    );
  typia.assert(banRecord1);
  // 3. Try to create duplicate ban with same user and community, expect error
  await TestValidator.error("duplicate ban rejected", async () => {
    await generate_random_community_platform_moderator_banned_users_create(
      moderatorConnection,
      { body: banCreateBody1 },
    );
  });
  // 4. Try creating a ban without reason (mandatory), expect error
  const banCreateBodyNoReason = {
    community_platform_user_id: typia.random<string & tags.Format<"uuid">>(),
    community_platform_community_id: typia.random<
      string & tags.Format<"uuid">
    >(),
    reason: "",
    banned_at: new Date().toISOString(),
    unbanned_at: null,
  } satisfies Parameters<
    typeof generate_random_community_platform_moderator_banned_users_create
  >[1]["body"];
  await TestValidator.error(
    "ban creation without reason rejected",
    async () => {
      await generate_random_community_platform_moderator_banned_users_create(
        moderatorConnection,
        { body: banCreateBodyNoReason },
      );
    },
  );
}
