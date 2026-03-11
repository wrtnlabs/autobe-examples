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

/**
 * Test the primary success path for retrieving historical section snapshots with pagination.
 * An administrator should be able to query snapshots for a specific section and receive
 * paginated results with snapshot summaries including captured_at timestamp, section name,
 * description, and lifecycle timestamps.
 *
 * Test validates:
 * (1) Admin authentication succeeds
 * (2) Section creation succeeds
 * (3) Snapshot query returns empty or populated list depending on section update history
 * (4) Pagination metadata includes correct current page, limit, total records, and total pages
 * (5) Each snapshot summary contains required fields (id, captured_at, name, section_created_at,
 *     section_updated_at, optional description, optional section_deleted_at)
 *
 * The test validates the basic snapshot retrieval workflow with standard pagination parameters
 * (page=1, limit=10).
 */
export async function test_api_section_snapshot_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      grade: RandomGenerator.pick(["regular", "super"] as const),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Query snapshots for the created section with pagination
  const snapshots =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", snapshots.pagination.current, 1);
  TestValidator.equals("limit is 10", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  // 5. Validate snapshot summaries contain required fields
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    // Required fields validation
    TestValidator.predicate("snapshot has valid id", snapshot.id.length > 0);
    TestValidator.predicate(
      "snapshot has captured_at",
      snapshot.captured_at.length > 0,
    );
    TestValidator.predicate("snapshot has name", snapshot.name.length > 0);
    TestValidator.predicate(
      "snapshot has section_created_at",
      snapshot.section_created_at.length > 0,
    );
    TestValidator.predicate(
      "snapshot has section_updated_at",
      snapshot.section_updated_at.length > 0,
    );
  }
}
