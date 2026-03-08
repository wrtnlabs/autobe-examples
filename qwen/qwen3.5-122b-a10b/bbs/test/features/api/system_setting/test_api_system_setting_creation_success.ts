import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_system_settings_create } from "../../../generate/generate_random_discussion_board_admin_system_settings_create";
import { prepare_random_discussion_board_system_setting } from "../../../prepare/prepare_random_discussion_board_system_setting";

/**
 * Test the primary success path for creating a new system-wide configuration setting.
 *
 * Test Flow:
 * 1. Authenticate as administrator using join endpoint
 * 2. Create a system setting with valid key, value, and optional description
 * 3. Validate the response contains all required fields
 * 4. Verify business logic: UUID format, timestamp validity, data integrity
 */
export async function test_api_system_setting_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Prepare input values for tracking
  const inputKey =
    RandomGenerator.alphabets(20) + "_" + RandomGenerator.alphabets(10);
  const inputValue = RandomGenerator.paragraph({ sentences: 10 });
  const inputDescription = RandomGenerator.paragraph({ sentences: 5 });
  // 3. Create system setting with valid data
  const setting =
    await generate_random_discussion_board_admin_system_settings_create(
      adminConnection,
      {
        body: {
          key: inputKey,
          value: inputValue,
          description: inputDescription,
        } satisfies IDiscussionBoardSystemSetting.ICreate,
      },
    );
  typia.assert(setting);
  // 4. Validate response structure and business logic
  TestValidator.predicate(
    "id is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      setting.id,
    ),
  );
  TestValidator.equals("key matches input", setting.key, inputKey);
  TestValidator.equals("value matches input", setting.value, inputValue);
  TestValidator.predicate(
    "description is not null",
    setting.description !== null,
  );
  TestValidator.equals(
    "description matches input",
    setting.description!,
    inputDescription,
  );
  TestValidator.predicate(
    "created_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      setting.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid datetime",
    /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
      setting.updated_at,
    ),
  );
  TestValidator.equals(
    "created_at equals updated_at for new record",
    setting.created_at,
    setting.updated_at,
  );
}
