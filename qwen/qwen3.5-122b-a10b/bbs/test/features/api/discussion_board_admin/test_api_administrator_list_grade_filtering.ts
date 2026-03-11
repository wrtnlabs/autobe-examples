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

/**
 * Test filtering administrators by grade level.
 *
 * A super administrator authenticates and retrieves the administrator list
 * filtered by grade='super' to see only super administrators, then filtered
 * by grade='regular' to see only regular administrators. Verify that the
 * grade filter correctly partitions the administrator roster and that each
 * filtered result contains only administrators matching the specified grade.
 * This validates the grade filtering capability which is critical for
 * administrators to manage different privilege levels.
 */
export async function test_api_administrator_list_grade_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "super",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create regular administrator
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 3. Query admin list filtered by grade='super'
  const superAdmins = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        grade: "super",
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(superAdmins);
  // 4. Query admin list filtered by grade='regular'
  const regularAdmins = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        grade: "regular",
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  typia.assert(regularAdmins);
  // 5. Validate super admin filtering results
  TestValidator.equals("super admin count", superAdmins.data.length, 1);
  TestValidator.equals("super admin grade", superAdmins.data[0].grade, "super");
  TestValidator.equals(
    "super admin ID matches",
    superAdmins.data[0].id,
    superAdmin.id,
  );
  // 6. Validate regular admin filtering results
  TestValidator.equals("regular admin count", regularAdmins.data.length, 1);
  TestValidator.equals(
    "regular admin grade",
    regularAdmins.data[0].grade,
    "regular",
  );
  TestValidator.equals(
    "regular admin ID matches",
    regularAdmins.data[0].id,
    regularAdmin.id,
  );
  // 7. Verify grade filtering correctly partitions the roster
  TestValidator.predicate("super admins have no regular grade", () =>
    superAdmins.data.every((admin) => admin.grade === "super"),
  );
  TestValidator.predicate("regular admins have no super grade", () =>
    regularAdmins.data.every((admin) => admin.grade === "regular"),
  );
}
