import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_administrator_grades_create } from "../../../generate/generate_random_discussion_board_super_administrator_administrator_grades_create";
import { prepare_random_discussion_board_administrator_grade } from "../../../prepare/prepare_random_discussion_board_administrator_grade";

export async function test_api_administrators_index_inactive_administrators_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup super administrator connection via join and authorization
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuthorized = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  superAdminConnection.headers ??= {};
  superAdminConnection.headers.Authorization =
    superAdminAuthorized.token.access;
  // 2. Create multiple admin grades as prerequisite
  // Create one regular and one super grade
  const regularGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: `regular_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          level: 1,
        },
      },
    );
  typia.assert(regularGrade);
  const superGrade =
    await generate_random_discussion_board_super_administrator_administrator_grades_create(
      superAdminConnection,
      {
        body: {
          name: `super_${RandomGenerator.alphabets(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          level: 10,
        },
      },
    );
  typia.assert(superGrade);
  // 3. For test purpose, create some administrators with active and deleted_at set
  // But since there's no direct API to create administrators specified, assume that such data exists
  // Use index endpoint to filter by active=false to get deleted admins
  // 4. Execute the index patch API with active: false to retrieve inactive admins
  const searchRequest: IDiscussionBoardAdministrator.IRequest = {
    active: false,
    page: 1,
    limit: 20,
  };
  const result = await api.functional.discussionBoard.administrators.index(
    superAdminConnection,
    {
      body: searchRequest,
    },
  );
  typia.assert(result);
  // 5. Validate that returned administrators are all inactive (deleted_at non-null)
  for (const admin of result.data) {
    TestValidator.predicate(
      `inactive admin deleted_at non-null for id ${admin.id}`,
      admin.deleted_at !== null && typeof admin.deleted_at === "string",
    );
  }
  // 6. Validate no active admins (deleted_at must be non-null)
  const hasActive = result.data.some((admin) => admin.deleted_at === null);
  TestValidator.predicate(
    "no active admins included when active=false filter",
    !hasActive,
  );
  // 7. Validate pagination info makes sense
  TestValidator.predicate(
    "pagination current page >= 1",
    result.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 1 and <= 100",
    result.pagination.limit >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    result.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    result.pagination.records >= 0,
  );
}
