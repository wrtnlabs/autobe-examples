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
 * Test scenario for requesting system message templates with filters that yield no results.
 * Verifies that empty data arrays are handled gracefully without error and proper pagination info is returned.
 * Admin authentication is validated as a prerequisite.
 */
export async function test_api_administrator_system_messages_list_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration and authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IDiscussionBoardAdministrator.IJoin,
  });
  adminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Request system messages with filters expected to produce empty results
  const body: IDiscussionBoardSystemMessage.IRequest = {
    // Empty filter or adding a filter that yields no results
  };
  const output: IPageIDiscussionBoardSystemMessage.ISummary =
    await api.functional.discussionBoard.administrator.systemMessages.index(
      adminConnection,
      {
        body,
      },
    );
  typia.assert(output);
  // 3. Validate the output
  TestValidator.predicate(
    "data array is empty",
    Array.isArray(output.data) && output.data.length === 0,
  );
  // Pagination checks
  TestValidator.predicate(
    "pagination pages is zero or more",
    output.pagination.pages >= 0,
  );
  // When no records, pagination should reflect zero or appropriate scaling
  if (output.pagination.records === 0) {
    TestValidator.equals(
      "pagination records equals zero",
      output.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination pages equals zero",
      output.pagination.pages,
      0,
    );
  } else {
    TestValidator.predicate(
      "pagination records positive",
      output.pagination.records > 0,
    );
    TestValidator.predicate(
      "pagination pages positive",
      output.pagination.pages > 0,
    );
  }
}
