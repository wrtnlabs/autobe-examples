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
export async function test_api_report_purge_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create moderator connection and authenticate via join (utility function)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator: ICommunityBbsModerator.IAuthorized =
    await authorize_moderator_join(moderatorConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
      } satisfies ICommunityBbsModerator.IJoin,
    });
  typia.assert(moderator);
  // Step 2: Call the purge endpoint (DELETE /communityBbs/moderator/users/reports) with moderator connection
  await api.functional.communityBbs.moderator.users.reports.erase(
    moderatorConnection,
  );
  // Step 3: Create an unauthenticated connection and verify it cannot purge reports
  const unauthConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot purge reports",
    async () => {
      await api.functional.communityBbs.moderator.users.reports.erase(
        unauthConnection,
      );
    },
  );
}
