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

export async function test_api_admin_section_statistics_update_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create admin authentication
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
  // Create a section
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
  // Update section statistics with valid values
  const updateBody: IDiscussionBoardSectionStatistic.IUpdate = {
    viewCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    articleCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    commentCount: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    lastActivityAt: new Date().toISOString(),
  };
  const updatedStats =
    await api.functional.discussionBoard.admin.sections.statistics.updateStatistics(
      adminConnection,
      {
        sectionId: section.id,
        body: updateBody,
      },
    );
  typia.assert(updatedStats);
  // Validate the updated statistics
  TestValidator.equals(
    "view count matches",
    updatedStats.view_count,
    updateBody.viewCount!,
  );
  TestValidator.equals(
    "article count matches",
    updatedStats.article_count,
    updateBody.articleCount!,
  );
  TestValidator.equals(
    "comment count matches",
    updatedStats.comment_count,
    updateBody.commentCount!,
  );
  TestValidator.equals(
    "last activity timestamp matches",
    updatedStats.last_activity_at,
    updateBody.lastActivityAt!,
  );
  TestValidator.equals(
    "section id matches",
    updatedStats.section.id,
    section.id,
  );
  TestValidator.predicate(
    "all timestamp fields are present",
    updatedStats.created_at !== undefined &&
      updatedStats.updated_at !== undefined &&
      updatedStats.last_activity_at !== undefined,
  );
}
