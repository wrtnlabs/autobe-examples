import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test section statistics retrieval with engagement simulation.
 * 1. Admin creates a section
 * 2. Retrieve initial statistics (should be zero counts)
 * 3. Validate statistics structure and initial values
 * Note: Actual article/comment creation for engagement simulation is not available
 * with current API functions, so testing focuses on basic statistics functionality.
 */
export async function test_api_section_statistics_retrieval_with_engagement(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication and section creation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
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
  // 2. Retrieve section statistics
  const statistics =
    await api.functional.discussionBoard.sections.statistics.at(
      adminConnection,
      {
        sectionId: section.id,
      },
    );
  typia.assert(statistics);
  // 3. Validate initial statistics
  TestValidator.equals("section ID matches", statistics.id, section.id);
  TestValidator.equals(
    "initial view count should be 0",
    statistics.view_count,
    0,
  );
  TestValidator.equals(
    "initial article count should be 0",
    statistics.article_count,
    0,
  );
  TestValidator.equals(
    "initial comment count should be 0",
    statistics.comment_count,
    0,
  );
  TestValidator.predicate(
    "last activity timestamp should be valid",
    new Date(statistics.last_activity_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created at timestamp should be valid",
    new Date(statistics.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated at timestamp should be valid",
    new Date(statistics.updated_at).getTime() > 0,
  );
  // Note: Article and comment creation endpoints are not available in the provided
  // API functions, so actual engagement simulation cannot be performed.
  // This test validates the basic statistics endpoint functionality.
}
