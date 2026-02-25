import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_reports_decision_delete_non_existent_id_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: null,
      bio: null,
      avatarUrl: null,
    },
  });
  moderatorConnection.headers = { Authorization: moderator.token.access };
  // Attempt to delete a non-existent report decision by random UUID
  const randomId = typia.random<string & tags.Format<"uuid">>();
  // Expect 404 HttpError
  await TestValidator.httpError(
    "Deleting non-existent report decision should return 404",
    404,
    async () => {
      await api.functional.communityPlatform.moderator.reports_decisions.erase(
        moderatorConnection,
        { id: randomId },
      );
    },
  );
}
