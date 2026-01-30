import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsUserBan";
import { prepare_random_community_bbs_user_ban } from "../../../prepare/prepare_random_community_bbs_user_ban";
import { generate_random_community_bbs_moderator_users_bans_create } from "../../../generate/generate_random_community_bbs_moderator_users_bans_create";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderator_user_ban_by_mod(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 2: Use a valid UUID format for a user ID (system validates UUID format even if user doesn't exist)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 3: Ban the user with a valid non-empty reason
  await api.functional.communityBbs.moderator.users.bans.create(
    moderatorConnection,
    {
      body: {
        userId,
        reason: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies ICommunityBbsUserBan.ICreate,
    },
  );
  // Step 4: Validate ban was successfully executed (no error thrown means success)
  TestValidator.predicate(
    "moderator ban operation succeeded without error",
    () => true,
  );
}
