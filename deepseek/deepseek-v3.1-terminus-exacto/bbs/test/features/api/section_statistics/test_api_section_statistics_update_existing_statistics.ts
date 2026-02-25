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

export async function test_api_section_statistics_update_existing_statistics(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Use an existing section ID (from platform usage)
  // In a real scenario, this would come from existing section data
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Assume section already has existing statistics
  // First get current statistics state by performing a null update
  const currentStats =
    await api.functional.discussionBoard.superAdmin.sections.statistics.updateStatistics(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: {}, // Empty update to get current state
      },
    );
  typia.assert(currentStats);
  const originalCreatedAt = currentStats.created_at;
  const originalUpdatedAt = currentStats.updated_at;
  // Step 4: Perform partial update - increment view count only
  const partialUpdateBody = {
    viewCount: currentStats.view_count + 100,
  } satisfies IDiscussionBoardSectionStatistic.IUpdate;
  // Wait briefly to ensure timestamp difference
  await new Promise((resolve) => setTimeout(resolve, 10));
  const updatedStats =
    await api.functional.discussionBoard.superAdmin.sections.statistics.updateStatistics(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: partialUpdateBody,
      },
    );
  typia.assert(updatedStats);
  // Step 5: Validate partial update behavior
  TestValidator.equals(
    "updated view count",
    updatedStats.view_count,
    currentStats.view_count + 100,
  );
  TestValidator.equals(
    "preserved article count",
    updatedStats.article_count,
    currentStats.article_count,
  );
  TestValidator.equals(
    "preserved comment count",
    updatedStats.comment_count,
    currentStats.comment_count,
  );
  TestValidator.equals(
    "preserved last activity",
    updatedStats.last_activity_at,
    currentStats.last_activity_at,
  );
  // Timestamp validation
  TestValidator.equals(
    "created_at remains same",
    updatedStats.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at should change",
    updatedStats.updated_at,
    originalUpdatedAt,
  );
  // Step 6: Test boundary case with large values
  const boundaryUpdateBody = {
    viewCount: 2147483640,
    articleCount: 2147483641,
  } satisfies IDiscussionBoardSectionStatistic.IUpdate;
  await new Promise((resolve) => setTimeout(resolve, 10));
  const boundaryStats =
    await api.functional.discussionBoard.superAdmin.sections.statistics.updateStatistics(
      superAdminConnection,
      {
        sectionId: sectionId,
        body: boundaryUpdateBody,
      },
    );
  typia.assert(boundaryStats);
  // Step 7: Validate boundary values are handled properly
  TestValidator.equals(
    "boundary view count",
    boundaryStats.view_count,
    2147483640,
  );
  TestValidator.equals(
    "boundary article count",
    boundaryStats.article_count,
    2147483641,
  );
  TestValidator.equals(
    "preserved comment count",
    boundaryStats.comment_count,
    currentStats.comment_count,
  );
  TestValidator.predicate(
    "boundary values are verified",
    boundaryStats.view_count > 2000000000,
  );
  // Step 8: Validate section information consistency throughout updates
  TestValidator.equals(
    "section id consistent",
    boundaryStats.section.id,
    currentStats.section.id,
  );
  TestValidator.equals(
    "section name consistent",
    boundaryStats.section.name,
    currentStats.section.name,
  );
  TestValidator.equals(
    "section description consistent",
    boundaryStats.section.description,
    currentStats.section.description,
  );
}
