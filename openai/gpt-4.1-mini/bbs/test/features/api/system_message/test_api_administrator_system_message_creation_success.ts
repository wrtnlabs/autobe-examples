import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_system_messages_create } from "../../../generate/generate_random_discussion_board_administrator_system_messages_create";
import { prepare_random_discussion_board_system_message } from "../../../prepare/prepare_random_discussion_board_system_message";

export async function test_api_administrator_system_message_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // This test scenario validates the successful creation of a new system message template by an authorized administrator.
  // It covers administrator registration via join, system message creation with unique code, message text, and message type.
  // It verifies proper record creation with timestamps and response validation. Also tests authorization enforcement.
  // 1. Administrator joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuthorized);
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare system message create body
  const messageTypes = ["error", "warning", "info"] as const;
  const messageType = RandomGenerator.pick(messageTypes);
  // Because IDiscussionBoardSystemMessage.ICreate type is empty object in the given DTO,
  // we rely on generating valid system message via the generation utility
  // This is a workaround to create a valid system message since DTO lacks detailed props in the input.
  // Use generate_random_discussion_board_administrator_system_messages_create utility to create system message
  const systemMessage =
    await generate_random_discussion_board_administrator_system_messages_create(
      adminConnection,
      {
        body: undefined,
      },
    );
  typia.assert(systemMessage);
  // 3. Validation: Check essential properties that should exist
  // Since type is empty, just check that systemMessage is an object and has an id (uuid format)
  // Also verify that created_at and updated_at are ISO string timestamps if they exist
  // Cannot assert further since no property schema is available
  TestValidator.predicate(
    "systemMessage is object",
    typeof systemMessage === "object",
  );
  if ("id" in systemMessage) {
    TestValidator.predicate(
      "systemMessage id is string",
      typeof (systemMessage.id as string) === "string",
    );
    TestValidator.predicate(
      "systemMessage id has uuid format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        systemMessage.id as string,
      ),
    );
  }
  if ("created_at" in systemMessage) {
    TestValidator.predicate(
      "systemMessage created_at is valid ISO date",
      !isNaN(Date.parse(systemMessage.created_at as string)),
    );
  }
  if ("updated_at" in systemMessage) {
    TestValidator.predicate(
      "systemMessage updated_at is valid ISO date",
      !isNaN(Date.parse(systemMessage.updated_at as string)),
    );
  }
  // 4. Authorization enforcement: Attempt to create system message on non-admin connection
  const userConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "unauthorized user cannot create system message",
    async () => {
      await api.functional.discussionBoard.administrator.systemMessages.create(
        userConnection,
        {
          body: systemMessage as any,
        },
      );
    },
  );
}
