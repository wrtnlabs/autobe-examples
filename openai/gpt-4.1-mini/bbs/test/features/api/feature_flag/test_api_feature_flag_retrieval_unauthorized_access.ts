import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_feature_flag_retrieval_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Attempt to retrieve a feature flag without authenticating
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Use a random UUID to attempt retrieval
  const featureFlagId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "unauthorized access to feature flag",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.administrator.featureFlags.at(
        unauthorizedConnection,
        { id: featureFlagId },
      );
    },
  );
}
