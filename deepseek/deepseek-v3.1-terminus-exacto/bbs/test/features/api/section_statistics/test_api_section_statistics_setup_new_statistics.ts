import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test the scenario where a section has no existing statistics and a super administrator creates initial statistics.
 * 1. Authenticate as superAdmin using join operation
 * 2. Call the statistics update endpoint with initial values
 * 3. Verify that a new statistics record is created (not updated)
 * 4. Validate that all count values are preserved correctly
 * 5. Check that timestamp is properly recorded
 * 6. Ensure response includes comprehensive statistics with section information
 */
export async function test_api_section_statistics_setup_new_statistics(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Use existing section from super admin authorization response
  const sectionId = superAdmin.section.id;
  // 3. Create initial statistics data
  const initialStatistics: IDiscussionBoardSectionStatistic.IUpdate = {
    viewCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    articleCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    commentCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    lastActivityAt: new Date().toISOString(),
  };
  // 4. Create initial statistics for the section
  const statistics =
    await api.functional.discussionBoard.superAdmin.sections.statistics.updateStatistics(
      superAdminConnection,
      {
        sectionId,
        body: initialStatistics,
      },
    );
  typia.assert(statistics);
  // 5. Validate statistics creation - test that new record was created
  TestValidator.equals("section ID matches", statistics.section.id, sectionId);
  TestValidator.equals(
    "view count preserved",
    statistics.view_count,
    initialStatistics.viewCount!,
  );
  TestValidator.equals(
    "article count preserved",
    statistics.article_count,
    initialStatistics.articleCount!,
  );
  TestValidator.equals(
    "comment count preserved",
    statistics.comment_count,
    initialStatistics.commentCount!,
  );
  TestValidator.predicate(
    "timestamp recorded",
    statistics.last_activity_at !== null,
  );
  TestValidator.predicate("has valid statistics ID", statistics.id.length > 0);
  TestValidator.predicate(
    "created at timestamp exists",
    statistics.created_at !== null,
  );
  TestValidator.predicate(
    "updated at timestamp exists",
    statistics.updated_at !== null,
  );
  // 6. Validate section information is included
  TestValidator.equals(
    "section name exists",
    typeof statistics.section.name,
    "string",
  );
  TestValidator.equals(
    "section description exists",
    typeof statistics.section.description,
    "string",
  );
  TestValidator.predicate(
    "section name not empty",
    statistics.section.name.length > 0,
  );
  TestValidator.predicate(
    "section status exists",
    statistics.section.status.length > 0,
  );
  TestValidator.predicate(
    "display order is valid",
    statistics.section.display_order >= 0,
  );
}
