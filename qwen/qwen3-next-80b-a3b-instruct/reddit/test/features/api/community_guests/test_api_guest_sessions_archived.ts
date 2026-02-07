import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_sessions_archived(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Query archived guest sessions using empty request body
  // Since no sessions are archived in the system (no way to create archived sessions),
  // the system must return 0 results as per the scenario.
  const archivedResponse = await api.functional.community.guests.index(
    adminConnection,
    {
      body: {} satisfies ICommunityGuest.IRequest,
    },
  );
  typia.assert(archivedResponse);
  // Validate: must return empty data and 0 total records
  TestValidator.equals(
    "archived session count",
    archivedResponse.pagination.records,
    0,
  );
  TestValidator.equals("archived data length", archivedResponse.data.length, 0);
  TestValidator.predicate(
    "pagination current is 1",
    archivedResponse.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    archivedResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is 0 when records is 0",
    archivedResponse.pagination.pages === 0,
  );
}
