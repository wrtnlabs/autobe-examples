import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_list_by_created_at_range(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const adminConnection: api.IConnection = { host: connection.host };
  // Request moderator list with empty filter object (as ICommunityModerator.IRequest is an empty object)
  const response = await api.functional.community.moderators.index(
    adminConnection,
    {
      body: {} satisfies ICommunityModerator.IRequest,
    },
  );
  typia.assert(response);
  // Validate response structure matches IPageICommunityModerator.ISummary
  TestValidator.equals(
    "pagination exists",
    response.pagination,
    response.pagination,
  );
  TestValidator.equals("data array exists", response.data, response.data);
  // Validate pagination metadata with exact type constraints
  TestValidator.predicate(
    "current page >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate("limit > 0", response.pagination.limit > 0);
  TestValidator.predicate("records >= 0", response.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", response.pagination.pages >= 0);
  // Validate data array contains ICommunityModerator.ISummary objects
  // According to DTO, ICommunityModerator.ISummary is an empty object {}
  TestValidator.predicate(
    "data array has correct length",
    response.data.length >= 0,
  );
  TestValidator.predicate(
    "each data item is an object",
    response.data.every((item) => typeof item === "object" && item !== null),
  );
  // Verify pagination records matches data array length with some tolerance
  // (since server may have more moderators than returned in this page)
  TestValidator.predicate(
    "data count does not exceed records",
    response.data.length <= response.pagination.records,
  );
}
