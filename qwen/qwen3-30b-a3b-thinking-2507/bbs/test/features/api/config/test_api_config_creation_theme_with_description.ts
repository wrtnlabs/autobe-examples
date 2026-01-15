import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfig";
import { prepare_random_discussion_board_config } from "../../../prepare/prepare_random_discussion_board_config";
import { generate_random_discussion_board_admin_configs_create } from "../../../generate/generate_random_discussion_board_admin_configs_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_config_creation_theme_with_description(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<
        string &
          tags.MinLength<8> &
          tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$">
      >(),
    },
  });
  const config: IDiscussionBoardConfig =
    await generate_random_discussion_board_admin_configs_create(
      adminConnection,
      {
        body: {
          key: "theme",
          value: "dark",
          description:
            "Dark theme for improved readability in low light conditions and to reduce eye strain",
        },
      },
    );
  TestValidator.equals(
    "theme configuration key should be 'theme'",
    config.configCode,
    "theme",
  );
  TestValidator.equals(
    "theme configuration value should be 'dark'",
    config.configValue,
    "dark",
  );
  TestValidator.equals(
    "theme configuration description should match the provided value",
    config.description,
    "Dark theme for improved readability in low light conditions and to reduce eye strain",
  );
  typia.assert(config);
}
