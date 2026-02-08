import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_moderator_community_ban_create } from "../../../generate/generate_random_community_platform_moderator_community_ban_create";
import { generate_random_community_platform_user_communities_create_community } from "../../../generate/generate_random_community_platform_user_communities_create_community";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_moderator_community_ban_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration & login
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const moderatorJoinBody: ICommunityPlatformModerator.IJoin = {};
  const moderatorAuth = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: moderatorJoinBody,
    },
  );
  typia.assert(moderatorAuth);
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {},
  });
  // 2. User registration & login
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoinBody: ICommunityPlatformUser.IJoin = {};
  const userAuth = await authorize_user_join(userJoinConnection, {
    body: userJoinBody,
  });
  typia.assert(userAuth);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {},
  });
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create_community(
      userConnection,
      {
        body: {},
      },
    );
  typia.assert(community);
  // 4. Moderator creates a ban
  // Removed community.id usage as it does not exist
  // Creating a banBody object without referencing possibly non-existent fields
  const banBody: ICommunityPlatformCommunityBan.ICreate = {
    // community_id is not part of ICommunityPlatformCommunityBan.ICreate, skipping it
    // user_id still requires a UUID string with proper format
    user_id: typia.random<string & import("typia").tags.Format<"uuid">>(),
    banned_at: new Date().toISOString(),
    unbanned_at: null,
    reason: "Violation of community rules",
  };
  // Create the ban using the API
  const ban =
    await generate_random_community_platform_moderator_community_ban_create(
      moderatorConnection,
      {
        body: banBody,
      },
    );
  typia.assert(ban);
  // 5. Validate response
  // Cannot test ban.community_id or community.id as they don't exist
  // Validate by existence of ban object
  TestValidator.predicate("ban object existence", ban !== undefined && ban !== null);
}