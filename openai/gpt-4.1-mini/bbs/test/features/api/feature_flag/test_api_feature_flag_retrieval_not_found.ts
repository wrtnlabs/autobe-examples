import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_feature_flag_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test that retrieving a non-existent feature flag by a super administrator returns 404, and unauthorized users cannot retrieve feature flags.
  // Prepare a new super administrator authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    adminConnection,
    {},
  );
  typia.assert(superAdmin);
  // Use super administrator connection with valid auth
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${superAdmin.token.access}` },
  };
  // Use a random UUID that (most likely) does not exist
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 1. Attempt to retrieve the feature flag with super admin authorization; expect 404 error
  await TestValidator.httpError(
    "retrieve non-existent feature flag returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.at(
        authorizedConnection,
        { id: nonExistentId },
      );
    },
  );
  // 2. Attempt the same retrieval without authorization; expect 401 error or auth failure
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized feature flag retrieval returns auth error",
    [401, 403],
    async () => {
      await api.functional.discussionBoard.superAdministrator.featureFlags.at(
        unauthorizedConnection,
        { id: nonExistentId },
      );
    },
  );
}
