import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_snapshots_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create a section
  const section =
    await generate_random_discussion_board_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1>
          >(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  // Since we don't have update functionality, we'll test with the existing snapshots
  // that may have been created during section creation
  // Test pagination with page 1 and limit 5
  const page1Response =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(page1Response);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "page 1 current page",
    page1Response.pagination.current,
    1,
  );
  TestValidator.equals("page 1 limit", page1Response.pagination.limit, 5);
  TestValidator.predicate(
    "page 1 records non-negative",
    page1Response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page 1 pages calculated correctly",
    page1Response.pagination.pages ===
      Math.ceil(page1Response.pagination.records / 5) ||
      (page1Response.pagination.records === 0 &&
        page1Response.pagination.pages === 0),
  );
  TestValidator.predicate(
    "page 1 data length <= limit",
    page1Response.data.length <= 5,
  );
  // Validate snapshot structure for each item
  page1Response.data.forEach((snapshot, index) => {
    TestValidator.predicate(
      `snapshot ${index + 1} has id`,
      typeof snapshot.id === "string" && snapshot.id.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index + 1} has name`,
      typeof snapshot.name === "string" && snapshot.name.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index + 1} has description`,
      typeof snapshot.description === "string" &&
        snapshot.description.length > 0,
    );
    TestValidator.predicate(
      `snapshot ${index + 1} has created_at`,
      typeof snapshot.created_at === "string" && snapshot.created_at.length > 0,
    );
  });
  // Test pagination with page 2 and limit 5
  const page2Response =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(page2Response);
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "page 2 current page",
    page2Response.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 5);
  TestValidator.equals(
    "page 2 records same as page 1",
    page2Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 2 pages same as page 1",
    page2Response.pagination.pages,
    page1Response.pagination.pages,
  );
  TestValidator.predicate(
    "page 2 data length <= limit",
    page2Response.data.length <= 5,
  );
  // Test pagination with page 3 and limit 5
  const page3Response =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(page3Response);
  // Validate pagination metadata for page 3
  TestValidator.equals(
    "page 3 current page",
    page3Response.pagination.current,
    3,
  );
  TestValidator.equals("page 3 limit", page3Response.pagination.limit, 5);
  TestValidator.equals(
    "page 3 records same as previous",
    page3Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.equals(
    "page 3 pages same as previous",
    page3Response.pagination.pages,
    page1Response.pagination.pages,
  );
  TestValidator.predicate(
    "page 3 data length <= limit",
    page3Response.data.length <= 5,
  );
  // Test default pagination (no page/limit specified)
  const defaultResponse =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {} satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(defaultResponse);
  // Validate default pagination metadata
  TestValidator.equals(
    "default current page",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "default limit reasonable",
    defaultResponse.pagination.limit > 0 &&
      defaultResponse.pagination.limit <= 100,
  );
  TestValidator.equals(
    "default records same as previous",
    defaultResponse.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.predicate(
    "default data length <= limit",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  // Test with different limit values
  const limit10Response =
    await api.functional.discussionBoard.superAdmin.sections.snapshots.index(
      superAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(limit10Response);
  TestValidator.equals(
    "limit 10 current page",
    limit10Response.pagination.current,
    1,
  );
  TestValidator.equals("limit 10 limit", limit10Response.pagination.limit, 10);
  TestValidator.equals(
    "limit 10 records same",
    limit10Response.pagination.records,
    page1Response.pagination.records,
  );
  TestValidator.predicate(
    "limit 10 data length <= limit",
    limit10Response.data.length <= 10,
  );
}
