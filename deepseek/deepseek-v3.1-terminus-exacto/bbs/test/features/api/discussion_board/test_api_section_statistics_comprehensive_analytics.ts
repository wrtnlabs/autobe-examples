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

export async function test_api_section_statistics_comprehensive_analytics(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create first section
  const section1 = await generate_random_discussion_board_admin_sections_create(
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
  typia.assert(section1);
  // Create second section
  const section2 = await generate_random_discussion_board_admin_sections_create(
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
  typia.assert(section2);
  // Create user connection for statistics retrieval (statistics endpoint doesn't require admin)
  const userConnection: api.IConnection = { host: connection.host };
  // Retrieve statistics for first section
  const stats1 = await api.functional.discussionBoard.sections.statistics.at(
    userConnection,
    {
      sectionId: section1.id,
    },
  );
  typia.assert(stats1);
  // Retrieve statistics for second section
  const stats2 = await api.functional.discussionBoard.sections.statistics.at(
    userConnection,
    {
      sectionId: section2.id,
    },
  );
  typia.assert(stats2);
  // Validate statistics structure and initial state
  TestValidator.notEquals("stats IDs are unique", stats1.id, stats2.id);
  TestValidator.equals("section1 view count is zero", stats1.view_count, 0);
  TestValidator.equals(
    "section1 article count is zero",
    stats1.article_count,
    0,
  );
  TestValidator.equals(
    "section1 comment count is zero",
    stats1.comment_count,
    0,
  );
  TestValidator.equals("section2 view count is zero", stats2.view_count, 0);
  TestValidator.equals(
    "section2 article count is zero",
    stats2.article_count,
    0,
  );
  TestValidator.equals(
    "section2 comment count is zero",
    stats2.comment_count,
    0,
  );
  TestValidator.predicate(
    "section1 last_activity_at is valid",
    stats1.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "section2 last_activity_at is valid",
    stats2.last_activity_at.length > 0,
  );
  TestValidator.predicate(
    "section1 created_at is valid",
    stats1.created_at.length > 0,
  );
  TestValidator.predicate(
    "section2 created_at is valid",
    stats2.created_at.length > 0,
  );
  TestValidator.predicate(
    "section1 updated_at is valid",
    stats1.updated_at.length > 0,
  );
  TestValidator.predicate(
    "section2 updated_at is valid",
    stats2.updated_at.length > 0,
  );
}
