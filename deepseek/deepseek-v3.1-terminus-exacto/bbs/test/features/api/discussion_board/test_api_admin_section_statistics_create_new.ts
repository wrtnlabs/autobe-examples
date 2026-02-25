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

export async function test_api_admin_section_statistics_create_new(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Create a new section
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Store input values for validation
  const inputViewCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const inputArticleCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  // Update statistics with partial data (only viewCount and articleCount)
  const statistics =
    await api.functional.discussionBoard.admin.sections.statistics.updateStatistics(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          viewCount: inputViewCount,
          articleCount: inputArticleCount,
        } satisfies IDiscussionBoardSectionStatistic.IUpdate,
      },
    );
  typia.assert(statistics);
  // Verify the system created a new statistics record with zero defaults
  TestValidator.equals("section id matches", statistics.section.id, section.id);
  TestValidator.equals(
    "view count matches input",
    statistics.view_count,
    inputViewCount,
  );
  TestValidator.equals(
    "article count matches input",
    statistics.article_count,
    inputArticleCount,
  );
  TestValidator.equals(
    "comment count defaults to 0",
    statistics.comment_count,
    0,
  );
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(Date.parse(statistics.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(Date.parse(statistics.updated_at)),
  );
  TestValidator.predicate(
    "last_activity_at is valid date",
    !isNaN(Date.parse(statistics.last_activity_at)),
  );
}
