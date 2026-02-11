import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunitySystemHealthLog";
import type { IRedditCommunitySystemHealthLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySystemHealthLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_system_health_logs_retrieve_all(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for system health log retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare request body with no filters
  const requestBody: IRedditCommunitySystemHealthLog.IRequest = {};
  // Call the API to retrieve all health logs
  const result = await api.functional.redditCommunity.system_health_logs.index(
    adminConnection,
    {
      body: requestBody,
    },
  );
  // Validate the response structure using typia.assert - validates entire structure including pagination and data fields
  typia.assert(result);
}
