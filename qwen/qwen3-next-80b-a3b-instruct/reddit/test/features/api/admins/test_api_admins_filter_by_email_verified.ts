import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_admins_filter_by_email_verified(
  connection: api.IConnection,
): Promise<void> {
  // The API endpoint retrieves administrators with no filtering capability as IRequest is empty {}
  // The scenario requesting email_verified filtering is impossible since no parameters are supported
  // and no admin creation/modification endpoint exists to establish verified/unverified states
  // Test the actual supported functionality: retrieving admins with empty request body
  const adminConnection: api.IConnection = { host: connection.host };
  // Call endpoint with empty body as defined by IRequest schema
  const result = await api.functional.community.admins.index(adminConnection, {
    body: {} satisfies ICommunityAdmin.IRequest,
  });
  // Validate response conforms to IPageICommunityAdmin.ISummary structure
  typia.assert(result);
  // Validate pagination exists and has required properties
  TestValidator.predicate("pagination exists", result.pagination !== undefined);
  TestValidator.predicate("data array exists", result.data !== undefined);
  // Validate pagination properties exist (per IPage.IPagination definition)
  TestValidator.predicate(
    "pagination has current page",
    typeof result.pagination.current === "number" &&
      result.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    typeof result.pagination.limit === "number" && result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has records",
    typeof result.pagination.records === "number" &&
      result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    typeof result.pagination.pages === "number" && result.pagination.pages >= 0,
  );
  // Validate data array elements are objects (ISummary is empty {} so can't validate specific properties)
  TestValidator.predicate(
    "data is array of objects",
    Array.isArray(result.data) &&
      result.data.every((item) => typeof item === "object" && item !== null),
  );
  // NOTE: The scenario requesting email_verified filtering cannot be implemented
  // as the API has no parameters for filtering and no mechanism to create or update admin records with verification status.
  // This test validates what is actually possible: retrieving admins with no parameters.
}
