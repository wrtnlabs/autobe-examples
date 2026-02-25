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

export async function test_api_admin_section_statistics_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Admin authentication with utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Create section using authenticated admin connection
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 2,
          wordMax: 4,
        }),
        description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 8,
        }),
        status: "active",
        display_order: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  const sectionCreatedAt = section.created_at;
  const sectionUpdatedAt = section.updated_at;
  // Step 3: Perform partial update - only commentCount
  const newCommentCount = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const statistics =
    await api.functional.discussionBoard.admin.sections.statistics.updateStatistics(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          commentCount: newCommentCount,
        } satisfies IDiscussionBoardSectionStatistic.IUpdate,
      },
    );
  typia.assert(statistics);
  // Step 4: Validate field-specific partial update
  TestValidator.equals(
    "commentCount should be updated",
    statistics.comment_count,
    newCommentCount,
  );
  TestValidator.predicate(
    "viewCount should be zero initially",
    statistics.view_count === 0,
  );
  TestValidator.predicate(
    "articleCount should be zero initially",
    statistics.article_count === 0,
  );
  // Step 5: Validate section reference
  TestValidator.equals(
    "section ID should match",
    statistics.section.id,
    section.id,
  );
  // Step 6: Validate timestamp progression
  TestValidator.predicate(
    "statistics created_at is valid",
    new Date(statistics.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "statistics updated_at is valid",
    new Date(statistics.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "statistics updated_at should be >= created_at",
    new Date(statistics.updated_at).getTime() >=
      new Date(statistics.created_at).getTime(),
  );
  TestValidator.predicate(
    "section timestamps should be earlier than statistics",
    new Date(sectionCreatedAt).getTime() <
      new Date(statistics.created_at).getTime() &&
      new Date(sectionUpdatedAt).getTime() <
        new Date(statistics.updated_at).getTime(),
  );
}
