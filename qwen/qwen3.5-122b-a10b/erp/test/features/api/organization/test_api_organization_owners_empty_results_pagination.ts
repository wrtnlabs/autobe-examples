import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import type { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import type { IHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganizationOwner";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmOrganizationOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmOrganizationOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test organization owners endpoint with empty results pagination.
 *
 * Validates the organization ownership retrieval endpoint handles empty result sets correctly with proper pagination metadata. The test queries ownership records with filters that return no matching records to verify proper empty array handling and pagination metadata accuracy.
 *
 * The test covers:
 * - Empty result set handling when querying with filters that match no records
 * - Pagination metadata accuracy (records=0, pages=0) for empty results
 * - HTTP 200 status for successful queries with no results (not 404)
 * - Various pagination parameter combinations with empty results
 *
 * 1. Create first member user and authenticate
 * 2. Create second member user for multi-user scenario
 * 3. Query owners endpoint with is_current=false on a non-existent organization to get empty results
 * 4. Verify response has empty data array
 * 5. Verify pagination shows records=0 and pages=0
 * 6. Test with different pagination parameters (page=2, limit=5)
 * 7. Query with is_current=true to verify empty results for current owners
 * 8. Verify all pagination metadata is accurate across different queries
 */
export async function test_api_organization_owners_empty_results_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create first member user and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member1Auth);
  // 2. Create second member user
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmMember.IJoin,
  });
  typia.assert(member2Auth);
  // 3. Query owners endpoint with is_current=false on a non-existent organization
  // This simulates an organization with no historical ownership records
  const organizationId = typia.random<string & tags.Format<"uuid">>();
  const emptyResult =
    await api.functional.hrm.member.organizations.owners.index(
      member1Connection,
      {
        organizationId,
        body: {
          is_current: false,
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(emptyResult);
  // 4. Verify response has empty data array
  TestValidator.equals("data array is empty", emptyResult.data.length, 0);
  // 5. Verify pagination shows records=0 and pages=0
  TestValidator.equals(
    "pagination records is 0",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "pagination current is 1",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    emptyResult.pagination.limit,
    10,
  );
  // 6. Test with different pagination parameters (page=2, limit=5)
  const emptyResultPage2 =
    await api.functional.hrm.member.organizations.owners.index(
      member1Connection,
      {
        organizationId,
        body: {
          is_current: false,
          page: 2,
          limit: 5,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(emptyResultPage2);
  TestValidator.equals("page 2 data is empty", emptyResultPage2.data.length, 0);
  TestValidator.equals(
    "page 2 records is 0",
    emptyResultPage2.pagination.records,
    0,
  );
  TestValidator.equals(
    "page 2 pages is 0",
    emptyResultPage2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "page 2 current is 2",
    emptyResultPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit is 5",
    emptyResultPage2.pagination.limit,
    5,
  );
  // 7. Query with is_current=true to verify empty results for current owners
  const emptyCurrentResult =
    await api.functional.hrm.member.organizations.owners.index(
      member1Connection,
      {
        organizationId,
        body: {
          is_current: true,
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(emptyCurrentResult);
  TestValidator.equals(
    "current owners data is empty",
    emptyCurrentResult.data.length,
    0,
  );
  TestValidator.equals(
    "current owners records is 0",
    emptyCurrentResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "current owners pages is 0",
    emptyCurrentResult.pagination.pages,
    0,
  );
  // 8. Query without is_current filter to verify all empty
  const emptyAllResult =
    await api.functional.hrm.member.organizations.owners.index(
      member1Connection,
      {
        organizationId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IHrmOrganizationOwner.IRequest,
      },
    );
  typia.assert(emptyAllResult);
  TestValidator.equals(
    "all owners data is empty",
    emptyAllResult.data.length,
    0,
  );
  TestValidator.equals(
    "all owners records is 0",
    emptyAllResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "all owners pages is 0",
    emptyAllResult.pagination.pages,
    0,
  );
}
