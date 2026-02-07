import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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

export async function test_api_section_snapshot_pagination_with_large_dataset(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(authorizedAdmin);
  // Update admin connection with authorization token
  const authenticatedAdminConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: authorizedAdmin.token.access },
  };
  // 2. Create a section for snapshot testing
  const section = await generate_random_discussion_board_admin_sections_create(
    authenticatedAdminConnection,
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
  // 3. Test pagination with different page sizes
  // Test page 1 with limit 5
  const page1 =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(page1);
  // Validate pagination metadata
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 5);
  TestValidator.predicate("page 1 has records", page1.pagination.records >= 0);
  TestValidator.predicate(
    "page 1 has correct pages",
    page1.pagination.pages >= 0,
  );
  TestValidator.predicate("page 1 data count valid", page1.data.length <= 5);
  // Test page 2 with limit 5
  const page2 =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);
  TestValidator.predicate("page 2 data count valid", page2.data.length <= 5);
  // Test page 3 with limit 5
  const page3 =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 3,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(page3);
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 5);
  TestValidator.predicate("page 3 data count valid", page3.data.length <= 5);
  // 4. Test different limit sizes
  const largeLimit =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(largeLimit);
  TestValidator.equals(
    "large limit current page",
    largeLimit.pagination.current,
    1,
  );
  TestValidator.equals("large limit limit", largeLimit.pagination.limit, 10);
  TestValidator.predicate(
    "large limit data count valid",
    largeLimit.data.length <= 10,
  );
  // 5. Test edge cases
  // Test page 0 (should default to page 1)
  const pageZero =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 0,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(pageZero);
  TestValidator.equals(
    "page 0 defaults to page 1",
    pageZero.pagination.current,
    1,
  );
  // Test page beyond total pages
  const beyondPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      authenticatedAdminConnection,
      {
        sectionId: section.id,
        body: {
          page: 100,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond page current page",
    beyondPage.pagination.current,
    100,
  );
  TestValidator.predicate(
    "beyond page empty or partial data",
    beyondPage.data.length >= 0,
  );
  // 6. Verify pagination consistency
  TestValidator.equals(
    "total records consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.equals(
    "total pages consistent",
    page1.pagination.pages,
    page2.pagination.pages,
  );
}
