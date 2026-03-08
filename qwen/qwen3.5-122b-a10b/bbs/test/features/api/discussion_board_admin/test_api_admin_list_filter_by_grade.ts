import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Super Admin",
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular admin connections (multiple)
  const regularAdmin1Connection: api.IConnection = { host: connection.host };
  const regularAdmin1 = await authorize_admin_join(regularAdmin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Regular Admin 1",
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin1);
  const regularAdmin2Connection: api.IConnection = { host: connection.host };
  const regularAdmin2 = await authorize_admin_join(regularAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Regular Admin 2",
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin2);
  // 3. Create another super admin connection
  const superAdmin2Connection: api.IConnection = { host: connection.host };
  const superAdmin2 = await authorize_admin_join(superAdmin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "Super Admin 2",
      bio: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin2);
  // 4. Filter by grade='regular'
  const regularFiltered =
    await api.functional.discussionBoard.admin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IDiscussionBoardAdmin.IRequest,
      },
    );
  typia.assert(regularFiltered);
  // Verify only regular admins are returned
  TestValidator.equals(
    "regular filter returns correct count",
    regularFiltered.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned admins have regular grade",
    regularFiltered.data.every((admin) => admin.grade === "regular"),
  );
  TestValidator.predicate(
    "pagination records match filtered count",
    regularFiltered.pagination.records === regularFiltered.data.length,
  );
  // 5. Filter by grade='super'
  const superFiltered = await api.functional.discussionBoard.admin.admins.index(
    superAdminConnection,
    {
      body: {
        grade: "super",
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(superFiltered);
  // Verify only super admins are returned
  TestValidator.equals(
    "super filter returns correct count",
    superFiltered.data.length,
    2,
  );
  TestValidator.predicate(
    "all returned admins have super grade",
    superFiltered.data.every((admin) => admin.grade === "super"),
  );
  TestValidator.predicate(
    "pagination records match filtered count",
    superFiltered.pagination.records === superFiltered.data.length,
  );
}
