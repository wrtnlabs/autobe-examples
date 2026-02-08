import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test scenario to verify retrieval of system message templates filtered by code and message type.
 * Ensures filtering is correctly applied and that the paginator and data contents reflect filter criteria.
 * Validates admin authorization dependencies.
 */
export async function test_api_administrator_system_messages_list_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(adminAuth);
  // 2. Retrieve system messages without filters to get baseline data
  const baseResult =
    await api.functional.discussionBoard.administrator.systemMessages.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(baseResult);
  // 3. Prepare filters based on baseResult data if available
  let sampleCode: string | undefined = undefined;
  let sampleMessageType: string | undefined = undefined;
  if (baseResult.data.length > 0) {
    const first = baseResult.data[0] as any;
    if (first && typeof first.code === "string") sampleCode = first.code;
    if (first && typeof first.message_type === "string") sampleMessageType = first.message_type;
  }
  // 4. Retrieve filtered list by code
  if (sampleCode !== undefined) {
    const filteredByCode =
      await api.functional.discussionBoard.administrator.systemMessages.index(
        adminConnection,
        {
          body: {
            code: sampleCode,
          } satisfies IDiscussionBoardSystemMessage.IRequest,
        },
      );
    typia.assert(filteredByCode);
    // Check all returned items contain the filter code
    for (const item of filteredByCode.data) {
      TestValidator.predicate(
        `filtered by code: item code matches '${sampleCode}'`,
        (item as any).code === sampleCode,
      );
    }
    TestValidator.predicate(
      "pagination limit is positive",
      filteredByCode.pagination.limit > 0,
    );
  }
  // 5. Retrieve filtered list by message type
  if (sampleMessageType !== undefined) {
    const filteredByMessageType =
      await api.functional.discussionBoard.administrator.systemMessages.index(
        adminConnection,
        {
          body: {
            message_type: sampleMessageType,
          } satisfies IDiscussionBoardSystemMessage.IRequest,
        },
      );
    typia.assert(filteredByMessageType);
    for (const item of filteredByMessageType.data) {
      TestValidator.predicate(
        `filtered by message_type: item message_type matches '${sampleMessageType}'`,
        (item as any).message_type === sampleMessageType,
      );
    }
    TestValidator.predicate(
      "pagination limit is positive",
      filteredByMessageType.pagination.limit > 0,
    );
  }
  // 6. Retrieve filtered list by both code and message type
  if (sampleCode !== undefined && sampleMessageType !== undefined) {
    const filteredByBoth =
      await api.functional.discussionBoard.administrator.systemMessages.index(
        adminConnection,
        {
          body: {
            code: sampleCode,
            message_type: sampleMessageType,
          } satisfies IDiscussionBoardSystemMessage.IRequest,
        },
      );
    typia.assert(filteredByBoth);
    for (const item of filteredByBoth.data) {
      TestValidator.predicate(
        `filtered by both: item code matches '${sampleCode}'`,
        (item as any).code === sampleCode,
      );
      TestValidator.predicate(
        `filtered by both: item message_type matches '${sampleMessageType}'`,
        (item as any).message_type === sampleMessageType,
      );
    }
    TestValidator.predicate(
      "pagination limit is positive",
      filteredByBoth.pagination.limit > 0,
    );
  }
}
