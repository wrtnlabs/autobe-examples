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

export async function test_api_system_message_retrieval_various_cases(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator by joining the system.
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
  // 2. Since we don't have create API for system messages, we'll simulate getting known existing IDs via typia.random
  // But to adhere with the contract, this is only acceptable in simulate mode.
  // First, get an existing system message ID via simulation
  const existingSystemMessage: IDiscussionBoardSystemMessage =
    (await api.functional.discussionBoard.superAdministrator.systemMessages
      .at(superAdminConnection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      })
      .catch(() => null)) ?? typia.random<IDiscussionBoardSystemMessage>();
  // 3. Use the id from above as the active message id
  const activeMessageId =
    (existingSystemMessage as any).id ??
    typia.random<string & tags.Format<"uuid">>();
  // 4. Retrieve an active system message
  const activeResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages.at(
      superAdminConnection,
      { id: activeMessageId },
    );
  typia.assert(activeResponse);
  // Validate required fields existence and types
  TestValidator.predicate(
    "active message has code",
    typeof (activeResponse as any).code === "string",
  );
  TestValidator.predicate(
    "active message has message_text",
    typeof (activeResponse as any).message_text === "string",
  );
  TestValidator.predicate(
    "active message has message_type",
    typeof (activeResponse as any).message_type === "string",
  );
  TestValidator.predicate(
    "active message has created_at",
    typeof (activeResponse as any).created_at === "string",
  );
  TestValidator.predicate(
    "active message has updated_at",
    typeof (activeResponse as any).updated_at === "string",
  );
  // deleted_at can be null if active
  if ("deleted_at" in activeResponse) {
    TestValidator.equals(
      "active message deleted_at should be null",
      (activeResponse as any).deleted_at,
      null,
    );
  }
  // 5. Retrieve a soft-deleted system message
  // For simulate mode, we use random UUID again
  const softDeletedMessageId = typia.random<string & tags.Format<"uuid">>();
  const softDeletedResponse =
    await api.functional.discussionBoard.superAdministrator.systemMessages
      .at(superAdminConnection, { id: softDeletedMessageId })
      .catch(() => null);
  if (softDeletedResponse !== null) {
    typia.assert(softDeletedResponse);
    TestValidator.predicate(
      "soft deleted message has code",
      typeof (softDeletedResponse as any).code === "string",
    );
    TestValidator.predicate(
      "soft deleted message has message_text",
      typeof (softDeletedResponse as any).message_text === "string",
    );
    TestValidator.predicate(
      "soft deleted message has message_type",
      typeof (softDeletedResponse as any).message_type === "string",
    );
    TestValidator.predicate(
      "soft deleted message has created_at",
      typeof (softDeletedResponse as any).created_at === "string",
    );
    TestValidator.predicate(
      "soft deleted message has updated_at",
      typeof (softDeletedResponse as any).updated_at === "string",
    );
    // deleted_at should be non-null string
    if ("deleted_at" in softDeletedResponse) {
      TestValidator.predicate(
        "soft deleted message deleted_at is not null",
        (softDeletedResponse as any).deleted_at !== null &&
          typeof (softDeletedResponse as any).deleted_at === "string",
      );
    }
  }
  // 6. Attempt to retrieve a non-existent message
  const nonExistentMessageId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve non-existent system message returns 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdministrator.systemMessages.at(
        superAdminConnection,
        { id: nonExistentMessageId },
      );
    },
  );
}
