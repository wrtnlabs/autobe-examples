import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_list_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      grade: "regular",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create multiple sections (more than default page limit to test pagination)
  const sectionCount = 15;
  const sections = await ArrayUtil.asyncRepeat(sectionCount, async () => {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        adminConnection,
        {
          body: {
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    return section;
  });
  // 3. Test sorting by created_at ascending
  const ascCreatedAt =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "asc",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(ascCreatedAt);
  // Validate ascending order
  for (let i = 1; i < ascCreatedAt.data.length; i++) {
    TestValidator.predicate(
      `created_at ascending at index ${i}`,
      ascCreatedAt.data[i - 1].created_at <= ascCreatedAt.data[i].created_at,
    );
  }
  // 4. Test sorting by created_at descending
  const descCreatedAt =
    await api.functional.discussionBoard.admin.sections.index(adminConnection, {
      body: {
        sort_by: "created_at",
        sort_order: "desc",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    });
  typia.assert(descCreatedAt);
  // Validate descending order
  for (let i = 1; i < descCreatedAt.data.length; i++) {
    TestValidator.predicate(
      `created_at descending at index ${i}`,
      descCreatedAt.data[i - 1].created_at >= descCreatedAt.data[i].created_at,
    );
  }
  // 5. Test sorting by name ascending
  const ascName = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "asc",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(ascName);
  // Validate ascending order
  for (let i = 1; i < ascName.data.length; i++) {
    TestValidator.predicate(
      `name ascending at index ${i}`,
      ascName.data[i - 1].name <= ascName.data[i].name,
    );
  }
  // 6. Test sorting by name descending
  const descName = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        sort_by: "name",
        sort_order: "desc",
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(descName);
  // Validate descending order
  for (let i = 1; i < descName.data.length; i++) {
    TestValidator.predicate(
      `name descending at index ${i}`,
      descName.data[i - 1].name >= descName.data[i].name,
    );
  }
  // 7. Test pagination with different page numbers
  const page1 = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(page2);
  // Validate pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.equals("total records", page1.pagination.records, sectionCount);
  TestValidator.equals(
    "calculated total pages",
    page1.pagination.pages,
    Math.ceil(sectionCount / 5),
  );
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate("page 2 has data", page2.data.length > 0);
  // Validate that pages contain different sections by comparing ID sets
  const page1Ids = new Set(page1.data.map((s) => s.id));
  const page2Ids = new Set(page2.data.map((s) => s.id));
  let hasDifferentData = false;
  for (const id of page1Ids) {
    if (!page2Ids.has(id)) {
      hasDifferentData = true;
      break;
    }
  }
  TestValidator.predicate("page 1 and 2 have different data", hasDifferentData);
  // 8. Test pagination with different limit values
  const limit10 = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(limit10);
  const limit20 = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(limit20);
  TestValidator.equals("limit 10", limit10.pagination.limit, 10);
  TestValidator.equals("limit 20", limit20.pagination.limit, 20);
  TestValidator.predicate("limit 10 respects limit", limit10.data.length <= 10);
  TestValidator.predicate("limit 20 respects limit", limit20.data.length <= 20);
  // 9. Test maximum limit (100)
  const maxLimit = await api.functional.discussionBoard.admin.sections.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 100,
      } satisfies IDiscussionBoardSection.IRequest,
    },
  );
  typia.assert(maxLimit);
  TestValidator.equals("max limit", maxLimit.pagination.limit, 100);
  TestValidator.equals(
    "max limit records",
    maxLimit.pagination.records,
    sectionCount,
  );
  TestValidator.predicate(
    "max limit returns all",
    maxLimit.data.length === sectionCount,
  );
}
