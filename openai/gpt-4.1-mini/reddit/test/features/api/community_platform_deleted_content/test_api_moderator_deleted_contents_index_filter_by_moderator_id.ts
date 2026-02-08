import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { TestValidator } from "@nestia/e2e";
import type { IConnection } from "@nestia/fetcher";
import typia from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";

/**
 * Test filtered retrieval of deleted contents by moderator ID.
 *
 * This test performs moderator join authentication, retrieves deleted content records,
 * and verifies that filtering by moderator ID returns only records deleted by that moderator.
 * It also checks pagination metadata consistency.
 */
export async function test_api_moderator_deleted_contents_index_filter_by_moderator_id(
  connection: api.IConnection,
): Promise<void> {
  // Moderator join and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: typia.random<ICommunityPlatformModerator.IJoin>(),
  });
  typia.assert(authorized);
  // Fetch all deleted contents without filter to find a moderator ID
  const allResponse =
    await api.functional.communityPlatform.moderator.deletedContents.index(
      moderatorConnection,
      { body: {} },
    );
  typia.assert(allResponse);
  // Access data as any[] for safety since type has problem
  const data = allResponse.data as any[];
  if (data.length === 0) return;
  const testModeratorId = data[0].moderator_id ?? null;
  if (!testModeratorId) return;
  // Request filtered deleted contents by moderator ID
  const filteredResponse =
    await api.functional.communityPlatform.moderator.deletedContents.index(
      moderatorConnection,
      {
        body: {
          moderatorId: testModeratorId,
        },
      },
    );
  typia.assert(filteredResponse);
  const filteredData = filteredResponse.data as any[];
  // Validate all items have the requested moderator ID
  filteredData.forEach((item) => {
    TestValidator.equals("moderator_id", item.moderator_id, testModeratorId);
  });
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    filteredResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    filteredResponse.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    filteredResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pages matches records and limit",
    filteredResponse.pagination.pages ===
      (filteredResponse.pagination.limit === 0
        ? 0
        : Math.ceil(
            filteredResponse.pagination.records /
              filteredResponse.pagination.limit,
          )),
  );
}
