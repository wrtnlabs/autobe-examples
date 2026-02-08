import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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
import { generate_random_discussion_board_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_administrator_feature_flags_create";
import { prepare_random_discussion_board_feature_flag } from "../../../prepare/prepare_random_discussion_board_feature_flag";

export async function test_api_feature_flag_creation_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator account creation and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 2. Create a new feature flag with random data using the utility function
  const featureFlag =
    await generate_random_discussion_board_administrator_feature_flags_create(
      adminConnection,
      {},
    );
  typia.assert(featureFlag);
  // 3. Attempt to create another feature flag with same input to check uniqueness constraint
  await TestValidator.error("duplicate code error", async () => {
    await generate_random_discussion_board_administrator_feature_flags_create(
      adminConnection,
      {},
    );
  });
}
