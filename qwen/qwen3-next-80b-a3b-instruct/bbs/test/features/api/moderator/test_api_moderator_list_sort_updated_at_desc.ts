import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardModerator";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardModerator";

export async function test_api_moderator_list_sort_updated_at_desc(
  connection: api.IConnection,
) {
  // Create three moderator accounts with sequential updates to establish updated_at order
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator1);

  // Update moderator1 to establish an updated_at timestamp
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator1Email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });

  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator2);

  // Update moderator2 to establish an updated_at timestamp
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator2Email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });

  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3 = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator3Email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });
  typia.assert(moderator3);

  // Update moderator3 to establish the most recent updated_at timestamp
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderator3Email,
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicBoardModerator.ICreate,
  });

  // Configure pagination request to sort by updated_at in descending order
  const request: IEconomicBoardModerator.IRequest = {
    sort: "updated_at",
    order: "desc",
    limit: 10,
  } satisfies IEconomicBoardModerator.IRequest;

  // Fetch moderator list with sorting
  const response: IPageIEconomicBoardModerator.ISummary =
    await api.functional.economicBoard.moderator.moderators.index(connection, {
      body: request,
    });
  typia.assert(response);

  // Verify response has data and at least three moderators
  TestValidator.predicate("response has data", response.data.length >= 3);

  // ISummary is defined as `string`, meaning it contains the moderator ID
  // Expected order: moderator3 (most recently updated), moderator2, moderator1 (least recently updated)
  const expectedOrder = [moderator3.id, moderator2.id, moderator1.id];

  // Verify the moderator IDs in the response are ordered by updated_at descending
  // Check only the first three since we know their order
  for (let i = 0; i < 3; i++) {
    TestValidator.equals(
      `moderator at position ${i} should be ${expectedOrder[i]} (most recent first)`,
      response.data[i],
      expectedOrder[i],
    );
  }
}
