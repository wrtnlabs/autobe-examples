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

export async function test_api_section_statistics_zero_values(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as an administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Create a discussion board section
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        status: "active",
        display_order: 0,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Update section statistics with zero values and valid past timestamp
  const now = new Date();
  const pastDate = new Date(now.getTime() - 1000 * 60 * 60 * 24); // 24 hours ago
  const zeroStatistics =
    await api.functional.discussionBoard.admin.sections.statistics.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          viewCount: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          articleCount: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          commentCount: 0 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
          lastActivityAt: pastDate.toISOString(),
        } satisfies IDiscussionBoardSectionStatistic.IUpdate,
      },
    );
  typia.assert(zeroStatistics);
  // 4. Validate zero values are correctly stored
  TestValidator.equals(
    "view count should be zero",
    zeroStatistics.view_count,
    0,
  );
  TestValidator.equals(
    "article count should be zero",
    zeroStatistics.article_count,
    0,
  );
  TestValidator.equals(
    "comment count should be zero",
    zeroStatistics.comment_count,
    0,
  );
  TestValidator.predicate(
    "last activity should be valid date",
    () =>
      typeof zeroStatistics.last_activity_at === "string" &&
      new Date(zeroStatistics.last_activity_at).toString() !== "Invalid Date",
  );
  TestValidator.predicate(
    "last activity should be in the past",
    () => new Date(zeroStatistics.last_activity_at) < now,
  );
  // 5. Test non-negative constraint by attempting to set negative value (should be rejected)
  await TestValidator.error("should reject negative view count", async () => {
    // Generate a negative number that satisfies the tagged type check
    const negativeValue = typia.random<
      number & tags.Type<"int32">
    >() satisfies number as number;
    // We need to create a value that's negative
    const negativeTest = Math.abs(negativeValue) * -1;
    await api.functional.discussionBoard.admin.sections.statistics.update(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          viewCount: negativeTest satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<0> as number,
        } satisfies IDiscussionBoardSectionStatistic.IUpdate,
      },
    );
  });
}
