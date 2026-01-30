import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_karma_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Create the moderator's karma score
  await api.functional.communityBbs.moderator.users.karma.create(
    moderatorConnection,
  );
  // Step 3: Delete the moderator's own karma score
  await api.functional.communityBbs.moderator.users.karma.erase(
    moderatorConnection,
  );
  // Step 4: Verify the karma score was permanently deleted by creating a new karma score
  // Since the karma score was deleted, creating a new one should succeed
  // This validates that the deletion was permanent and the system is ready for new karma creation
  await api.functional.communityBbs.moderator.users.karma.create(
    moderatorConnection,
  );
}
