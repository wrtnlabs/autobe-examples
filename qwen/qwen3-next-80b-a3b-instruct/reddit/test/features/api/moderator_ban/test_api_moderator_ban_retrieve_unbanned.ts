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

export async function test_api_moderator_ban_retrieve_unbanned(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host, headers: {} };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  moderatorConnection.headers!.Authorization = moderator.token.access;
  // 2. Create a ban record
  const banRecord = await generate_random_community_moderator_bans_create(
    moderatorConnection,
    {
      body: {} satisfies ICommunityBannedUser.ICreate,
    },
  );
  typia.assert(banRecord);
  // 3. Unban the user (set deleted_at)
  const unbannedRecord = await api.functional.community.moderator.bans.erase(
    moderatorConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(unbannedRecord);
  // 4. Retrieve the unbanned ban record
  const retrievedRecord = await api.functional.community.moderator.bans.at(
    moderatorConnection,
    {
      banId: banRecord.id,
    },
  );
  typia.assert(retrievedRecord);
  // 5. Validate the retrieved record
  TestValidator.equals("ban ID matches", retrievedRecord.id, banRecord.id);
  TestValidator.equals(
    "community ID matches",
    retrievedRecord.community_id,
    banRecord.community_id,
  );
  TestValidator.equals(
    "banned user ID matches",
    retrievedRecord.banned_user_id,
    banRecord.banned_user_id,
  );
  TestValidator.equals(
    "banned by ID matches",
    retrievedRecord.banned_by_id,
    banRecord.banned_by_id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedRecord.reason,
    banRecord.reason,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedRecord.created_at,
    banRecord.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedRecord.updated_at,
    banRecord.updated_at,
  );
  TestValidator.predicate(
    "deleted_at exists and is not null",
    retrievedRecord.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is a valid date-time",
    retrievedRecord.deleted_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at is set",
    retrievedRecord.deleted_at !== null,
    true,
  );
}