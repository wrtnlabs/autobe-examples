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

export async function test_api_feature_flag_multiple_creation_sequences(
  connection: api.IConnection,
): Promise<void> {
  // Test the creation of multiple feature flags consecutively by an authenticated administrator.
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create multiple feature flags
  const createdFlags: IDiscussionBoardFeatureFlag[] = [];
  const count = 3; // Number of feature flags to create
  for (let i = 0; i < count; ++i) {
    const body: IDiscussionBoardFeatureFlag.ICreate = {
      code: `feature_flag_code_${i}_${RandomGenerator.alphabets(4)}`,
      name: `Feature Flag ${i} - ${RandomGenerator.name()}`,
      explain: RandomGenerator.paragraph({ sentences: 3 }),
      enabled: i % 2 === 0,
    };
    const created =
      await generate_random_discussion_board_administrator_feature_flags_create(
        adminConnection,
        {
          body,
        },
      );
    typia.assert(created);
    createdFlags.push(created);
  }
  // 3. Validate that all created feature flags are typed correctly
  for (const flag of createdFlags) {
    typia.assert(flag);
  }
}
