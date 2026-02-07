import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_moderator_bans_create } from "../../../generate/generate_random_community_moderator_bans_create";
import { prepare_random_community_banned_user } from "../../../prepare/prepare_random_community_banned_user";

export async function test_api_moderator_ban_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create a new moderator account
  const moderatorConnection: api.IConnection = {
    host: connection.host,
  } satisfies api.IConnection;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // authorize_moderator_join automatically updates moderatorConnection.headers with Authorization token
  // 2. Create a ban record by banning a user from the moderator's community
  const moderatorBannedUser =
    await generate_random_community_moderator_bans_create(moderatorConnection, {
      body: {} satisfies ICommunityBannedUser.ICreate,
    });
  typia.assert(moderatorBannedUser);
  // 3. Retrieve the active ban record using the ban ID
  const retrievedBan = await api.functional.community.moderator.bans.at(
    moderatorConnection,
    {
      banId: moderatorBannedUser.id,
    },
  );
  typia.assert(retrievedBan);
  // 4. Validate the retrieved ban record matches the created one
  TestValidator.equals(
    "ban ID matches",
    retrievedBan.id,
    moderatorBannedUser.id,
  );
  TestValidator.equals(
    "community ID matches",
    retrievedBan.community_id,
    moderatorBannedUser.community_id,
  );
  TestValidator.equals(
    "banned user ID matches",
    retrievedBan.banned_user_id,
    moderatorBannedUser.banned_user_id,
  );
  TestValidator.equals(
    "banned by ID matches",
    retrievedBan.banned_by_id,
    moderatorBannedUser.banned_by_id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedBan.reason,
    moderatorBannedUser.reason,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedBan.created_at,
    moderatorBannedUser.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedBan.updated_at,
    moderatorBannedUser.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null for active ban",
    retrievedBan.deleted_at,
    null,
  );
}
