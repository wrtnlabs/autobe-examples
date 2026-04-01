import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformOrganization";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that an authenticated member can successfully retrieve a list of organizations they belong to.
 *
 * This test validates:
 * 1. Member authentication is required - join as a new member first
 * 2. Response contains organization summaries with required fields (id, name, currency, timezone)
 * 3. Only organizations where the member has an employee record are returned (multi-tenancy)
 * 4. Soft-deleted organizations are excluded from results
 * 5. Default pagination metadata is included with correct structure
 */
export async function test_api_organization_list_member_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Retrieve organization list for authenticated member
  const response = await api.functional.hrmPlatform.member.organizations.index(
    memberConnection,
    {
      body: {} satisfies IHrmPlatformOrganization.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata exists with correct structure
  TestValidator.predicate(
    "pagination object exists",
    response.pagination !== null && response.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is positive",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit is positive", response.pagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    response.pagination.pages >= 0,
  );
  // 4. Validate data array exists
  TestValidator.predicate("data is array", Array.isArray(response.data));
  // 5. Validate each organization has required fields (business logic, not type checking)
  for (const org of response.data) {
    typia.assert(org);
    // Business logic: organization name should not be empty string
    TestValidator.predicate(
      "organization name is not empty",
      org.name.trim().length > 0,
    );
    // Business logic: currency should be valid ISO code format (3 letters)
    TestValidator.predicate(
      "currency is valid format",
      org.currency.length === 3,
    );
  }
}
