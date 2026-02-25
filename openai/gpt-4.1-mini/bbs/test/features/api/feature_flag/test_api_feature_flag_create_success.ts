import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

/**
 * Test creating a new feature flag successfully by a super administrator.
 * Steps:
 * 1. Register a new super administrator account
 * 2. Authenticate and obtain auth token
 * 3. Submit a valid feature flag creation request
 * 4. Verify response contains the created feature flag with all fields
 */
export async function test_api_feature_flag_create_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & typia.tags.Format<"uri">>(),
        referrer: typia.random<string & typia.tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Set token header for subsequent calls
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization = superAdmin.token.access;
  // 2. Prepare feature flag create body
  const body = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    enabled: true,
  } as unknown as any;
  // 3. Create feature flag
  const featureFlag =
    await generate_random_discussion_board_super_administrator_feature_flags_create(
      superAdminConnection,
      { body },
    );
  typia.assert(featureFlag);
  // 4. Validate response fields
  TestValidator.predicate(
    "featureFlag.id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      featureFlag.id,
    ),
  );
  TestValidator.equals("featureFlag.code matches", featureFlag.code, body.code);
  TestValidator.equals("featureFlag.name matches", featureFlag.name, body.name);
  TestValidator.equals(
    "featureFlag.description matches",
    featureFlag.description,
    body.description,
  );
  TestValidator.equals(
    "featureFlag.enabled matches",
    featureFlag.enabled,
    body.enabled,
  );
  TestValidator.predicate(
    "featureFlag.createdAt is ISO date",
    !isNaN(Date.parse(featureFlag.createdAt)),
  );
  TestValidator.predicate(
    "featureFlag.updatedAt is ISO date",
    !isNaN(Date.parse(featureFlag.updatedAt)),
  );
  TestValidator.predicate(
    "featureFlag.deletedAt is null or ISO date",
    featureFlag.deletedAt === null ||
      !isNaN(Date.parse(featureFlag.deletedAt ?? "")),
  );
}
