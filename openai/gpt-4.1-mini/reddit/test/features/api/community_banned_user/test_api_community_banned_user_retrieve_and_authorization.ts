import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
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
import { generate_random_community_platform_moderator_community_banned_users_create_community_banned_user } from "../../../generate/generate_random_community_platform_moderator_community_banned_users_create_community_banned_user";
import { prepare_random_community_platform_community_banned_user } from "../../../prepare/prepare_random_community_platform_community_banned_user";

export async function test_api_community_banned_user_retrieve_and_authorization(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of a banned user record by ID
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  const authorizedModerator = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {},
    },
  );
  typia.assert(authorizedModerator);
  moderatorJoinConnection.headers = {
    Authorization: authorizedModerator.token.access,
  };
  const bannedUserRecordRaw =
    await generate_random_community_platform_moderator_community_banned_users_create_community_banned_user(
      moderatorJoinConnection,
      {},
    );
  const bannedUserRecord = typia.assert(bannedUserRecordRaw) as unknown as {
    id: string;
    community_id: string;
    user_id: string;
    banned_at: string;
    ban_reason: string | null;
  };
  const retrievedBannedUserRaw =
    await api.functional.communityPlatform.moderator.community_banned_users.at(
      moderatorJoinConnection,
      {
        bannedUserId: bannedUserRecord.id,
      },
    );
  const retrievedBannedUser = typia.assert(retrievedBannedUserRaw) as unknown as {
    id: string;
    community_id: string;
    user_id: string;
    banned_at: string;
    ban_reason: string | null;
  };

  TestValidator.equals(
    "banned user record id match",
    retrievedBannedUser.id,
    bannedUserRecord.id,
  );
  TestValidator.equals(
    "banned user community_id match",
    retrievedBannedUser.community_id,
    bannedUserRecord.community_id,
  );
  TestValidator.equals(
    "banned user user_id match",
    retrievedBannedUser.user_id,
    bannedUserRecord.user_id,
  );
  TestValidator.equals(
    "banned at timestamp match",
    retrievedBannedUser.banned_at,
    bannedUserRecord.banned_at,
  );
  TestValidator.equals(
    "ban reason match",
    retrievedBannedUser.ban_reason,
    bannedUserRecord.ban_reason,
  );

  // Scenario 2: Retrieval attempt with invalid/non-existent bannedUserId
  await TestValidator.error(
    "retrieving non-existent banned user throws",
    async () => {
      await api.functional.communityPlatform.moderator.community_banned_users.at(
        moderatorJoinConnection,
        {
          bannedUserId: "00000000-0000-0000-0000-000000000000",
        },
      );
    },
  );

  // Scenario 3: Retrieval attempt without moderator authentication
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized retrieval of banned user record",
    401,
    async () => {
      await api.functional.communityPlatform.moderator.community_banned_users.at(
        unauthorizedConnection,
        {
          bannedUserId: bannedUserRecord.id,
        },
      );
    },
  );
}
