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
 * Test filtering permissions by code pattern to locate permissions within a specific domain area.
 *
 * Validates the permission catalog search functionality where administrators can filter permissions by domain keywords when configuring custom roles. The test authenticates as a member, queries permissions with a code filter for the 'employee' domain, and verifies that all returned permissions belong to that domain while others are excluded.
 *
 * Special attention is given to ensuring the partial match filtering works correctly - searching 'employee' should return permissions like 'employee:manage', 'employee:view', 'employee:invite' but exclude 'project:manage', 'time:approve', or 'org:manage'.
 *
 * 1. Member registers with email and password credentials.
 * 2. Member queries permission catalog with code filter 'employee'.
 * 3. Validates all returned permissions have codes containing 'employee'.
 * 4. Confirms pagination metadata is correctly structured.
 * 5. Validates each permission entry contains required fields (id, code, description, created_at).
 */
export async function test_api_permission_filter_by_code_pattern(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IHrmPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Query permissions with code filter for 'employee' domain
  const searchPattern = "employee";
  const permissions = await api.functional.hrmPlatform.member.permissions.index(
    memberConnection,
    {
      body: {
        code: searchPattern,
        page: 1,
        limit: 100,
      } satisfies IHrmPlatformPermission.IRequest,
    },
  );
  typia.assert(permissions);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    permissions.pagination !== undefined,
  );
  TestValidator.predicate(
    "current page is 1",
    permissions.pagination.current === 1,
  );
  TestValidator.predicate("limit is 100", permissions.pagination.limit === 100);
  TestValidator.predicate(
    "records count is non-negative",
    permissions.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    permissions.pagination.pages >= 0,
  );
  // 4. Validate all returned permissions contain the search pattern in their code
  TestValidator.predicate(
    "at least one employee permission exists",
    permissions.data.length > 0,
  );
  for (const permission of permissions.data) {
    // Validate permission code contains the search pattern (business logic validation)
    TestValidator.predicate(
      "permission code contains search pattern",
      permission.code.toLowerCase().includes(searchPattern.toLowerCase()),
    );
  }
}
