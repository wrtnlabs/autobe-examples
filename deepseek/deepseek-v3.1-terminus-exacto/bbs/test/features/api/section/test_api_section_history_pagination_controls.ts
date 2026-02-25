import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionSnapshot";
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

export async function test_api_section_history_pagination_controls(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a section for testing
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        display_order: 1,
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // Generate 15 snapshots through sequential modifications
  await ArrayUtil.asyncRepeat(15, async (index) => {
    const updateBody = {
      name: `${section.name} - Modified ${index + 1}`,
      description: `${section.description} - Update ${index + 1}`,
      display_order: index + 1,
    } satisfies IDiscussionBoardSection.IUpdate;
    const updatedSection =
      await api.functional.discussionBoard.admin.sections.update(
        adminConnection,
        {
          sectionId: section.id,
          body: updateBody,
        },
      );
    typia.assert(updatedSection);
    return updatedSection;
  });
  // Test pagination with first page, limit 5, default sorting
  const firstPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate first page pagination metadata - access properties correctly
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "first page limit",
    firstPage.pagination.pagination.pagination.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "first page has correct record count",
    firstPage.pagination.pagination.pagination.pagination.records >= 15,
  );
  TestValidator.predicate(
    "first page calculates correct total pages",
    firstPage.pagination.pagination.pagination.pagination.pages >= 3,
  );
  TestValidator.equals(
    "first page returns correct number of items",
    firstPage.data.length,
    5,
  );
  // Test pagination with second page, limit 5
  const secondPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.pagination.pagination.pagination.current,
    2,
  );
  TestValidator.equals(
    "second page limit",
    secondPage.pagination.pagination.pagination.pagination.limit,
    5,
  );
  TestValidator.notEquals(
    "second page has different data",
    firstPage.data[0]?.id,
    secondPage.data[0]?.id,
  );
  // Test sorting by created_at ascending
  const ascendingPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
          sort: "created_at",
          order: "asc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(ascendingPage);
  // Test sorting by created_at descending
  const descendingPage =
    await api.functional.discussionBoard.admin.sections.snapshots.index(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          page: 1,
          limit: 5,
          sort: "created_at",
          order: "desc",
        } satisfies IDiscussionBoardSectionSnapshot.IRequest,
      },
    );
  typia.assert(descendingPage);
  // Validate that ascending and descending sorting produces different first items
  TestValidator.notEquals(
    "ascending and descending ordering differ",
    ascendingPage.data[0]?.id,
    descendingPage.data[0]?.id,
  );
}
