import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

/**
 * Test section snapshot audit trail functionality.
 *
 * This test verifies that snapshots accurately capture section state changes
 * over time, providing an immutable audit trail for compliance and tracking.
 * The test creates a section and validates the snapshot retrieval functionality,
 * ensuring proper chronological ordering and data integrity.
 */
export async function test_api_section_snapshot_audit_trail(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdministrator.IJoin,
  });
  // 2. Create initial section
  const section =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: typia.random<string>(),
          description: typia.random<string>(),
        } satisfies IDiscussionBoardSection.ICreate,
      },
    );
  typia.assert(section);
  const sectionCreatedAt = section.created_at;
  // 3. Retrieve snapshots for the section
  const snapshotsResponse =
    await api.functional.discussionBoard.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          sortBy: "created_at",
          sortOrder: "desc",
          limit: 100,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 4. Validate snapshot response structure
  TestValidator.predicate(
    "has pagination",
    snapshotsResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "has data array",
    snapshotsResponse.data !== undefined,
  );
  // 5. Validate chronological ordering (most recent first)
  if (snapshotsResponse.data.length > 1) {
    for (let i = 1; i < snapshotsResponse.data.length; i++) {
      const currentTimestamp = new Date(
        snapshotsResponse.data[i].created_at,
      ).getTime();
      const previousTimestamp = new Date(
        snapshotsResponse.data[i - 1].created_at,
      ).getTime();
      TestValidator.predicate(
        `snapshot ${i} created_at <= snapshot ${i - 1} created_at`,
        currentTimestamp <= previousTimestamp,
      );
    }
  }
  // 6. Validate each snapshot structure
  for (const snapshot of snapshotsResponse.data) {
    typia.assert(snapshot);
    // Validate snapshot has required fields
    TestValidator.predicate("has snapshot id", snapshot.id !== undefined);
    TestValidator.predicate("has name", snapshot.name !== undefined);
    TestValidator.predicate(
      "has section_created_at",
      snapshot.section_created_at !== undefined,
    );
    TestValidator.predicate(
      "has section_updated_at",
      snapshot.section_updated_at !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "has section reference",
      snapshot.section !== undefined,
    );
    // Validate section_created_at matches original section creation time
    TestValidator.equals(
      "section_created_at matches original",
      snapshot.section_created_at,
      sectionCreatedAt,
    );
    // Validate section reference points to correct section
    TestValidator.equals(
      "section reference id matches",
      snapshot.section.id,
      section.id,
    );
    // Validate section name in reference matches snapshot name
    TestValidator.equals(
      "section name matches snapshot name",
      snapshot.section.name,
      snapshot.name,
    );
  }
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination records matches data length",
    snapshotsResponse.pagination.records,
    snapshotsResponse.data.length,
  );
  TestValidator.predicate(
    "pagination current page is valid",
    snapshotsResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    snapshotsResponse.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    snapshotsResponse.pagination.pages >= 0,
  );
}
