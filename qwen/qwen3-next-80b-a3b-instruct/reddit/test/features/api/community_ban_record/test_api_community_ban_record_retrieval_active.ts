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

export async function test_api_community_ban_record_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator using utility function
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Generate random UUIDs for community and banned user
  const communityId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  const bannedUserId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string;
  // 3. Retrieve the active ban record using the authorized connection
  const banRecord =
    await api.functional.community.moderator.communities.banned_users.at(
      moderatorConnection,
      {
        communityId,
        bannedUserId,
      },
    );
  typia.assert(banRecord);
  // 4. Validate the ban record is active (deleted_at is null) - business logic check
  TestValidator.equals("ban record is active", banRecord.deleted_at, null);
}
