import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_patch_list_basic_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create multiple super administrator accounts for testing pagination
  const superAdmins: IDiscussionBoardSuperAdmin.IAuthorized[] = [];
  for (let i = 0; i < 15; i++) {
    const superAdminConnection: api.IConnection = { host: connection.host };
    const authorized = await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
    typia.assert(authorized);
    superAdmins.push(authorized);
  }
  // Test 1: Default pagination (should return first page with default limit)
  const defaultPageConnection: api.IConnection = { host: connection.host };
  const defaultPageResponse =
    await api.functional.discussionBoard.super_admins.index(
      defaultPageConnection,
      {
        body: {} satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(defaultPageResponse);
  TestValidator.equals(
    "default page should be 1",
    defaultPageResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit should be reasonable",
    defaultPageResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records should match created admins",
    defaultPageResponse.pagination.records >= superAdmins.length,
  );
  TestValidator.predicate(
    "total pages should be calculated correctly",
    defaultPageResponse.pagination.pages ===
      Math.ceil(
        defaultPageResponse.pagination.records /
          defaultPageResponse.pagination.limit,
      ),
  );
  // Test 2: Explicit pagination with small limit
  const explicitPageConnection: api.IConnection = { host: connection.host };
  const explicitPageResponse =
    await api.functional.discussionBoard.super_admins.index(
      explicitPageConnection,
      {
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(explicitPageResponse);
  TestValidator.equals(
    "explicit page should be 1",
    explicitPageResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "explicit limit should be 5",
    explicitPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "data length should not exceed limit",
    explicitPageResponse.data.length <= 5,
  );
  // Test 3: Second page with same limit
  const secondPageConnection: api.IConnection = { host: connection.host };
  const secondPageResponse =
    await api.functional.discussionBoard.super_admins.index(
      secondPageConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSuperAdmin.IRequest,
      },
    );
  typia.assert(secondPageResponse);
  TestValidator.equals(
    "second page should be 2",
    secondPageResponse.pagination.current,
    2,
  );
  TestValidator.equals(
    "limit should remain 5",
    secondPageResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "second page data should have items",
    secondPageResponse.data.length > 0,
  );
  // Validate super administrator summary structure
  if (defaultPageResponse.data.length > 0) {
    const summary = defaultPageResponse.data[0];
    TestValidator.predicate("summary should have id", !!summary.id);
    TestValidator.predicate(
      "summary should have permission_level",
      !!summary.permission_level,
    );
    TestValidator.predicate(
      "summary should have assignment_date",
      !!summary.assignment_date,
    );
    // Only validate properties that actually exist on ISummary
    // Remove the invalid timestamp property checks
  }
}