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

export async function test_api_section_statistics_update_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create a section to update statistics for
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Update section statistics
  const updateBody = {
    viewCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<1000>
    >(),
    articleCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
    >(),
    commentCount: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<500>
    >(),
    lastActivityAt: new Date().toISOString(),
  } satisfies IDiscussionBoardSectionStatistic.IUpdate;
  const updatedStatistics =
    await api.functional.discussionBoard.admin.sections.statistics.update(
      adminConnection,
      {
        sectionId: section.id,
        body: updateBody,
      },
    );
  typia.assert(updatedStatistics);
  // Validate updated statistics match expected values
  TestValidator.equals(
    "view count should match",
    updatedStatistics.view_count,
    updateBody.viewCount!,
  );
  TestValidator.equals(
    "article count should match",
    updatedStatistics.article_count,
    updateBody.articleCount!,
  );
  TestValidator.equals(
    "comment count should match",
    updatedStatistics.comment_count,
    updateBody.commentCount!,
  );
  TestValidator.equals(
    "last activity timestamp should match",
    updatedStatistics.last_activity_at,
    updateBody.lastActivityAt!,
  );
  // Validate section reference
  TestValidator.equals(
    "section ID should match",
    updatedStatistics.section.id,
    section.id,
  );
  TestValidator.equals(
    "section name should match",
    updatedStatistics.section.name,
    section.name,
  );
  TestValidator.equals(
    "section description should match",
    updatedStatistics.section.description,
    section.description,
  );
  // Validate timestamps
  TestValidator.predicate(
    "created at should be valid ISO string",
    () => !isNaN(new Date(updatedStatistics.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated at should be valid ISO string",
    () => !isNaN(new Date(updatedStatistics.updated_at).getTime()),
  );
  TestValidator.predicate(
    "updated at should be after created at",
    () =>
      new Date(updatedStatistics.updated_at) >=
      new Date(updatedStatistics.created_at),
  );
}
