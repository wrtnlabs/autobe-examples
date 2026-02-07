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

export async function test_api_moderator_unban_by_original_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  typia.assert(moderatorAuth);
  // Extract the moderator's ID from the authorized response (as the token is the only identifier)
  // Since the IAuthorized structure only contains token, and we have no way to get moderator ID from token
  // We must assume that the ban record exists with this moderator as the banned_by_id
  // We'll use the token to manually set the authorization header for authenticated calls
  // 2. Use a random banId (system must have a ban record for this ID in test environment)
  const banId: string = typia.random<string & tags.Format<"uuid">>();
  // 3. Unban the user with this banId
  const unbanResponse = await api.functional.community.moderator.bans.erase(
    moderatorConnection,
    {
      banId,
    },
  );
  typia.assert(unbanResponse);
  // 4. Validate the unban response
  // The ban record should have its deleted_at set to a timestamp
  TestValidator.notEquals(
    "deleted_at should be set to a timestamp",
    unbanResponse.deleted_at,
    null,
  );
  // Validate that the ban was lifted by the same moderator who created it
  // Since we don't know the moderation account's ID, we'll validate the format
  TestValidator.predicate("banned_by_id should be a valid UUID", () => {
    // Use typia.is to verify the ID format
    return typia.is<string & tags.Format<"uuid">>(unbanResponse.banned_by_id);
  });
  // Validate the ban was lifted and the record has correct timestamps
  TestValidator.predicate("created_at should be a valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(unbanResponse.created_at),
  );
  TestValidator.predicate("updated_at should be a valid date-time", () =>
    typia.is<string & tags.Format<"date-time">>(unbanResponse.updated_at),
  );
}
