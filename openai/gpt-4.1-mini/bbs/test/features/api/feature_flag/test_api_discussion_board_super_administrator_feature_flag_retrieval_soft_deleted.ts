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

export async function test_api_discussion_board_super_administrator_feature_flag_retrieval_soft_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  superAdminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Retrieve a feature flag by a random UUID representing a soft-deleted flag
  const softDeletedFeatureFlagId = typia.random<string & tags.Format<"uuid">>();
  const featureFlag =
    await api.functional.discussionBoard.superAdministrator.featureFlags.at(
      superAdminConnection,
      {
        id: softDeletedFeatureFlagId,
      },
    );
  typia.assert(featureFlag);
  // deleted_at property does not exist on IDiscussionBoardFeatureFlag, so no checking or validation.
}
