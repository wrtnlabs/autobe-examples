import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_system_messages_create_system_message } from "../../../generate/generate_random_discussion_board_super_administrator_system_messages_create_system_message";
import { prepare_random_discussion_board_system_message } from "../../../prepare/prepare_random_discussion_board_system_message";

export async function test_api_system_message_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as super administrator via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(superAdmin);
  // Update connection with authorized token
  superAdminConnection.headers = { Authorization: superAdmin.token.access };
  // Prepare system message creation body
  const body = {
    code: `sysmsg_${RandomGenerator.alphabets(8)}`,
    messageText: RandomGenerator.paragraph({ sentences: 3 }),
    messageType: RandomGenerator.pick(["error", "warning", "info"]),
  } satisfies IDiscussionBoardSystemMessage.ICreate;
  // Create system message
  const created =
    await generate_random_discussion_board_super_administrator_system_messages_create_system_message(
      superAdminConnection,
      { body },
    );
  typia.assert(created);
  // Validate all properties present and proper format
  TestValidator.predicate(
    "id is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      created.id,
    ),
  );
  TestValidator.equals("code matches", created.code, body.code);
  TestValidator.equals(
    "messageText matches",
    created.messageText,
    body.messageText,
  );
  TestValidator.equals(
    "messageType matches",
    created.messageType,
    body.messageType,
  );
  // Validate ISO 8601 date-time format strings
  TestValidator.predicate(
    "createdAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(created.createdAt),
  );
  TestValidator.predicate(
    "updatedAt is ISO date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(created.updatedAt),
  );
  TestValidator.equals("deletedAt is null", created.deletedAt, null);
}
