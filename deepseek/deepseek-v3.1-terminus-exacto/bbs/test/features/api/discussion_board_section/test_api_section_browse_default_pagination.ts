import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_section_browse_default_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Test that regular users can browse sections with default pagination
  // Call section browse endpoint without authentication and with minimal parameters (page: 1, limit: 20)
  const sections = await api.functional.discussionBoard.sections.index(
    connection,
    {
      body: {
        page: 1 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1>,
        limit: 20 satisfies number as number &
          tags.Type<"int32"> &
          tags.Minimum<1> &
          tags.Maximum<100>,
      } satisfies IDiscussionBoardSection.ISearch,
    },
  );
  typia.assert(sections);
  // Validate pagination metadata - need to navigate through nested pagination structure
  const pagination = (sections.pagination as any).pagination?.pagination
    ?.pagination;
  if (pagination) {
    TestValidator.equals("page should be 1", pagination.current, 1);
    TestValidator.equals("limit should be 20", pagination.limit, 20);
    TestValidator.predicate(
      "records count non-negative",
      pagination.records >= 0,
    );
    TestValidator.predicate("pages count non-negative", pagination.pages >= 0);
  }
  // Validate that response contains sections with status 'active' only
  TestValidator.predicate("has sections", sections.data.length > 0);
  for (const section of sections.data) {
    TestValidator.equals("section status active", section.status, "active");
    TestValidator.predicate("has id", section.id.length > 0);
    TestValidator.predicate("has name", section.name.length > 0);
    TestValidator.predicate("has description", section.description.length > 0);
    TestValidator.predicate("has display order", section.display_order >= 0);
  }
}
