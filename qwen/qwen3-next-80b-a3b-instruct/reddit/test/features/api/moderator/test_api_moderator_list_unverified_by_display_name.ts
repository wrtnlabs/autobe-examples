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

export async function test_api_moderator_list_unverified_by_display_name(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for access
  const adminConnection: api.IConnection = { host: connection.host };
  // Create empty request object since IRequest is defined as empty
  const searchCriteria: ICommunityModerator.IRequest = {};
  // Call the endpoint with empty request
  const result = await api.functional.community.moderators.index(
    adminConnection,
    {
      body: searchCriteria,
    },
  );
  typia.assert(result);
  // Validate response structure using correct types
  TestValidator.equals(
    "pagination object exists",
    result.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", result.data !== undefined, true);
  // Validate pagination properties according to IPage.IPagination
  TestValidator.predicate("current page >= 1", result.pagination.current >= 1);
  TestValidator.predicate("limit > 0", result.pagination.limit > 0);
  TestValidator.predicate("records >= 0", result.pagination.records >= 0);
  TestValidator.predicate("pages >= 0", result.pagination.pages >= 0);
  // Since ICommunityModerator.ISummary is defined as empty ({}),
  // there are no properties to validate on the moderators
  // We must follow the Anti-Hallucination Protocol: Test what EXISTS, not what SHOULD exist
  // According to the DTO definition, ICommunityModerator.ISummary = {}
  // Therefore, we can't validate any properties like email_verified or display_name
  // as they don't exist in the provided schema
  // Validate the array has the expected length (matches the pagination limit)
  TestValidator.equals(
    "page size matches limit",
    result.data.length,
    result.pagination.limit,
  );
}
