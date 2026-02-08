import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemMessage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSystemMessage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemMessage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_messages_list_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  const baseConnection: api.IConnection = { host: connection.host };
  // Fetch first page of system messages
  const page1 =
    await api.functional.discussionBoard.system_messages.list.index(
      baseConnection,
    );
  typia.assert(page1);
  // Validate pagination properties
  TestValidator.predicate(
    "pagination current positive",
    page1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );
  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(page1.data));
  // Since individual message fields are not exposed, we do not test them
  // Fetch again to simulate page size 5 (no direct param support; just confirm no error)
  const page5 =
    await api.functional.discussionBoard.system_messages.list.index(
      baseConnection,
    );
  typia.assert(page5);
  TestValidator.predicate("page5 data length > 0", page5.data.length > 0);
  // Fetch without extra headers (no auth required)
  const noAuthConnection: api.IConnection = { host: connection.host };
  const noAuthPage =
    await api.functional.discussionBoard.system_messages.list.index(
      noAuthConnection,
    );
  typia.assert(noAuthPage);
  TestValidator.predicate(
    "noAuthPage data length > 0",
    noAuthPage.data.length > 0,
  );
  // Confirm pagination consistency between calls
  TestValidator.equals(
    "pagination consistency",
    {
      current: page1.pagination.current,
      limit: page1.pagination.limit,
      pages: page1.pagination.pages,
      records: page1.pagination.records,
    },
    {
      current: noAuthPage.pagination.current,
      limit: noAuthPage.pagination.limit,
      pages: noAuthPage.pagination.pages,
      records: noAuthPage.pagination.records,
    },
  );
}
