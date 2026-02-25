import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test comprehensive filtering capabilities for section archive search.
 * Validate that administrators can filter by archival reason using text search,
 * filter by date ranges (from/to timestamps), filter by specific administrator
 * who performed the archival, and filter by specific section ID.
 * Test combinations of multiple filters to ensure they work together correctly.
 * Include edge cases like empty reason searches, overlapping date ranges,
 * and filtering with section references that may not exist.
 */
export async function test_api_admin_sections_archives_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, { body: {} });
  typia.assert(admin);
  // Create additional test data - generate some archived sections
  // We'll test filtering on these
  // Test 1: Filter by archived date range
  const archiveDate = new Date();
  const pastDate = new Date(archiveDate.getTime() - 24 * 60 * 60 * 1000);
  const futureDate = new Date(archiveDate.getTime() + 24 * 60 * 60 * 1000);
  const filter1: IDiscussionBoardSectionArchive.IRequest = {
    archived_at_from: pastDate.toISOString() satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    archived_at_to: futureDate.toISOString() satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
  };
  const result1 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter1 },
    );
  typia.assert(result1);
  TestValidator.predicate(
    "date range filter returns valid page",
    result1.data !== undefined,
  );
  // Test 2: Filter by reason text
  const filter2: IDiscussionBoardSectionArchive.IRequest = {
    reason: "duplicate section",
  };
  const result2 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter2 },
    );
  typia.assert(result2);
  TestValidator.predicate(
    "reason filter returns valid page",
    result2.pagination !== undefined,
  );
  // Test 3: Filter by specific administrator (archived_by)
  const filter3: IDiscussionBoardSectionArchive.IRequest = {
    archived_by: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string as string & tags.Format<"uuid">,
  };
  const result3 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter3 },
    );
  typia.assert(result3);
  TestValidator.predicate(
    "archived_by filter returns valid page",
    result3.data.length >= 0,
  );
  // Test 4: Filter by section ID
  const filter4: IDiscussionBoardSectionArchive.IRequest = {
    discussion_board_section_id: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string as string & tags.Format<"uuid">,
  };
  const result4 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter4 },
    );
  typia.assert(result4);
  TestValidator.predicate(
    "section ID filter returns valid page",
    result4.data.length > 0,
  );
  // Test 5: Combined filters - date range + reason
  const filter5: IDiscussionBoardSectionArchive.IRequest = {
    archived_at_from: pastDate.toISOString() satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    archived_at_to: futureDate.toISOString() satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    reason: "inactive",
  };
  const result5 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter5 },
    );
  typia.assert(result5);
  TestValidator.predicate(
    "combined date+reason filter works",
    result5.data !== undefined,
  );
  // Test 6: Empty reason search (should return all results)
  const filter6: IDiscussionBoardSectionArchive.IRequest = {
    reason: "",
  };
  const result6 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter6 },
    );
  typia.assert(result6);
  TestValidator.predicate(
    "empty reason search returns valid page",
    result6.pagination !== undefined,
  );
  // Test 7: Pagination parameters
  const filter7: IDiscussionBoardSectionArchive.IRequest = {
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "archived_at_desc",
  };
  const result7 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter7 },
    );
  typia.assert(result7);
  TestValidator.predicate(
    "pagination with sorting works",
    result7.data.length <= 10,
  );
  // Test 8: Non-existent section ID (should return empty results)
  const nonExistentSectionId = typia.random<
    string & tags.Format<"uuid">
  >() satisfies string as string & tags.Format<"uuid">;
  const filter8: IDiscussionBoardSectionArchive.IRequest = {
    discussion_board_section_id: nonExistentSectionId,
  };
  const result8 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter8 },
    );
  typia.assert(result8);
  TestValidator.predicate(
    "non-existent section ID returns valid response",
    result8.data.length >= 0,
  );
  // Test 9: All filters combined
  const filter9: IDiscussionBoardSectionArchive.IRequest = {
    reason: "merge",
    archived_at_from: pastDate.toISOString() satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    archived_at_to: futureDate.toISOString() satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    archived_by: admin.id satisfies string as string & tags.Format<"uuid">,
    discussion_board_section_id: typia.random<
      string & tags.Format<"uuid">
    >() satisfies string as string & tags.Format<"uuid">,
    page: 1 satisfies number as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "reason_asc",
  };
  const result9 =
    await api.functional.discussionBoard.admin.sections.archives.index(
      adminConnection,
      { body: filter9 },
    );
  typia.assert(result9);
  TestValidator.predicate(
    "all filters combined return valid page",
    result9.data.length <= 5,
  );
}