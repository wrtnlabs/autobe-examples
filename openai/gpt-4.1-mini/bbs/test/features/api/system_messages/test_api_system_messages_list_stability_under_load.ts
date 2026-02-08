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

export async function test_api_system_messages_list_stability_under_load(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection and no authentication needed
  const baseConnection: api.IConnection = { host: connection.host };
  // Make multiple rapid requests to the system messages list endpoint
  const requestCount = 20;
  const results: IPageIDiscussionBoardSystemMessage.ISummary[] = [];
  for (let i = 0; i < requestCount; ++i) {
    const response =
      await api.functional.discussionBoard.system_messages.list.index(
        baseConnection,
      );
    typia.assert(response);
    results.push(response);
  }
  // Validate that all retrieved pages have the same pagination info and content
  if (results.length > 1) {
    const first = results[0];
    for (let i = 1; i < results.length; ++i) {
      const current = results[i];
      // Pagination must be equal
      TestValidator.equals(
        `pagination equality check between request 0 and request ${i}`,
        current.pagination,
        first.pagination,
      );
      // Data array length must be equal
      TestValidator.equals(
        `data length equality check between request 0 and request ${i}`,
        current.data.length,
        first.data.length,
      );
      // Each message summary must be identical by content in sequence
      for (let j = 0; j < current.data.length; ++j) {
        TestValidator.equals(
          `message at index ${j} equality check between request 0 and request ${i}`,
          current.data[j],
          first.data[j],
        );
      }
    }
  }
}
