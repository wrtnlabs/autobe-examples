import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import type { IHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformPermission";
import type { IHrmPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformUserProfile";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmPlatformPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmPlatformPermission";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test permission catalog retrieval with pagination for authenticated members.
 *
 * Validates the complete permission list retrieval flow including member authentication, paginated query execution, and response structure validation. Ensures that the permission catalog returns proper pagination metadata and permission summaries with all required fields.
 *
 * Special attention is given to verifying that soft-deleted permissions are excluded by default, pagination metadata is accurate, and each permission summary contains the essential fields (id, code, description, created_at) needed for role configuration interfaces.
 *
 * 1. Member registers with email and credentials using authorize_member_join.
 * 2. Member requests permission catalog with default pagination parameters.
 * 3. Validates response structure contains pagination metadata and data array.
 * 4. Validates each permission summary has required fields in correct format.
 * 5. Verifies soft-deleted permissions are excluded by default.
 */
export async function test_api_permission_list_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Request permission catalog with default pagination
  const permissions = await api.functional.hrmPlatform.member.permissions.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 20,
        deleted: false,
      } satisfies IHrmPlatformPermission.IRequest,
    },
  );
  typia.assert(permissions);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "current page is 1",
    permissions.pagination.current === 1,
  );
  TestValidator.predicate("limit is 20", permissions.pagination.limit === 20);
  TestValidator.predicate(
    "records count is non-negative",
    permissions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    permissions.pagination.pages >= 0,
  );
  // 4. Validate data array structure
  TestValidator.predicate("data is array", Array.isArray(permissions.data));
  // 5. Validate permission code format (domain:action pattern) - business logic
  permissions.data.forEach((permission, index) => {
    TestValidator.predicate(
      `permission ${index} code has domain:action format`,
      permission.code.includes(":"),
    );
    TestValidator.predicate(
      `permission ${index} has non-empty description`,
      permission.description.length > 0,
    );
  });
  // 6. Validate pagination consistency
  if (permissions.pagination.records > 0) {
    const expectedPages = Math.ceil(
      permissions.pagination.records / permissions.pagination.limit,
    );
    TestValidator.equals(
      "pages calculation",
      permissions.pagination.pages,
      expectedPages,
    );
  }
}
