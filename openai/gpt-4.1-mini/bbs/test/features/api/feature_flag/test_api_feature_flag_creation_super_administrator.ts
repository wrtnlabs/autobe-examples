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
import { generate_random_discussion_board_super_administrator_feature_flags_create } from "../../../generate/generate_random_discussion_board_super_administrator_feature_flags_create";
import { prepare_random_discussion_board_feature_flag } from "../../../prepare/prepare_random_discussion_board_feature_flag";

export async function test_api_feature_flag_creation_super_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully create a new feature flag
  // Authenticate as a super administrator by joining the system
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {},
  });
  // Create a unique feature flag
  const createBody1 = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    enabled: true,
  };
  const createdFeatureFlag1 =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      superAdminConnection,
      { body: createBody1 },
    );
  typia.assert(createdFeatureFlag1);
  // Scenario 2: Attempt to create a feature flag with a duplicate code
  // For duplicate code, we reuse the code from createBody1 because the DTO type is empty and we cannot access properties, so just reuse the code string variable
  const duplicateCode = createBody1.code;
  const duplicateBody = {
    code: duplicateCode,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    enabled: true,
  };
  await TestValidator.error("duplicate feature flag code", async () => {
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      superAdminConnection,
      { body: duplicateBody },
    );
  });
}
