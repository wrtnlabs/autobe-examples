import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_platform_users_filter_karma_range_not_deleted(
  connection: api.IConnection,
): Promise<void> {
  // Use actor-specific connection
  const connectionFiltered: api.IConnection = { host: connection.host };
  // Prepare empty request body since no filter properties are defined
  const body: ICommunityPlatformUser.IRequest = {};
  // Query the user list
  const response = await api.functional.communityPlatform.users.index(
    connectionFiltered,
    {
      body,
    },
  );
  // Validate response type
  typia.assert(response);
  // Validate pagination fields
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current > 0,
  );
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination current page within pages",
    pagination.current <= pagination.pages || pagination.pages === 0,
  );
  // Validate each user summary in data
  for (const user of response.data) {
    typia.assert(user);
  }
}
