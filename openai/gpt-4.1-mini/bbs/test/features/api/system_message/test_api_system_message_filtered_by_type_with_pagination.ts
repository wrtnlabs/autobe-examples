import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_system_message_filtered_by_type_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Auth as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "TestPassword1234!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  // Step 2: Test filtered index with messageType filter and pagination
  // Try with messageType = "error" and set limit small to test multiple pages
  const messageTypeFilter = "error";
  const limitPerPage = 5;
  let currentPage = 1;
  let totalPages = 0;
  let totalRecords = 0;
  const allMessages: IDiscussionBoardSystemMessage.ISummary[] = [];
  do {
    const requestBody = {
      messageType: messageTypeFilter,
      page: currentPage,
      limit: limitPerPage,
    } satisfies IDiscussionBoardSystemMessage.IRequest;
    const page =
      await api.functional.discussionBoard.superAdministrator.systemMessages.index(
        superAdminConnection,
        { body: requestBody },
      );
    typia.assert(page);
    // Validate pagination structure consistency
    TestValidator.predicate(
      `pagination current page is expected=${currentPage}`,
      page.pagination.current === currentPage,
    );
    if (currentPage === 1) {
      totalPages = page.pagination.pages;
      totalRecords = page.pagination.records;
      TestValidator.predicate(
        "total pages greater than or equal to zero",
        totalPages >= 0,
      );
      TestValidator.predicate(
        "total records greater than or equal to zero",
        totalRecords >= 0,
      );
    }
    // Validate all returned messages have the filtered messageType
    for (const message of page.data) {
      typia.assert(message);
      TestValidator.equals(
        "messageType matches filter",
        message.messageType,
        messageTypeFilter,
      );
      allMessages.push(message);
    }
    currentPage++;
  } while (currentPage <= totalPages && totalPages > 0);
  // Validate accumulated messages count same as total records
  TestValidator.equals(
    "accumulated messages count",
    allMessages.length,
    totalRecords,
  );
}
