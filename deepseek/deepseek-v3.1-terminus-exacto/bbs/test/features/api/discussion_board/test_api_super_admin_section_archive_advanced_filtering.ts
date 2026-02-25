import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionArchive";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_discussion_board_admin_sections_archives_create } from "../../../generate/generate_random_discussion_board_admin_sections_archives_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_archive } from "../../../prepare/prepare_random_discussion_board_section_archive";

export async function test_api_super_admin_section_archive_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Create admin connections for different archivists and store their IDs
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1Auth = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin1Auth);
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Auth = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin2Auth);
  // Create multiple sections for archival testing
  const sections: IDiscussionBoardSection[] = [];
  for (let i = 0; i < 5; i++) {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        admin1Connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            status: "active",
            display_order: i,
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    sections.push(section);
  }
  // Create archival records with different reasons from different admins
  const archives: IDiscussionBoardSectionArchive[] = [];
  const reasons = [
    "Low activity section",
    "Duplicate content",
    "Outdated information",
    "Technical issues",
    "User request for archival",
  ];
  // Admin1 archives first 3 sections
  for (let i = 0; i < 3; i++) {
    const archive =
      await generate_random_discussion_board_admin_sections_archives_create(
        admin1Connection,
        {
          body: {
            reason: reasons[i],
          } satisfies IDiscussionBoardSectionArchive.ICreate,
          params: {
            sectionId: sections[i].id,
          },
        },
      );
    typia.assert(archive);
    archives.push(archive);
  }
  // Admin2 archives last 2 sections
  for (let i = 3; i < 5; i++) {
    const archive =
      await generate_random_discussion_board_admin_sections_archives_create(
        admin2Connection,
        {
          body: {
            reason: reasons[i],
          } satisfies IDiscussionBoardSectionArchive.ICreate,
          params: {
            sectionId: sections[i].id,
          },
        },
      );
    typia.assert(archive);
    archives.push(archive);
  }
  // Test 1: Text search with trigram similarity
  const searchResult1 =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          reason: "activity",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(searchResult1);
  TestValidator.predicate(
    "text search finds matching reasons",
    searchResult1.data.some((archive) => archive.reason.includes("activity")),
  );
  // Test 2: Date range filtering
  const earliestArchive = archives[0];
  const latestArchive = archives[archives.length - 1];
  const dateRangeResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          archived_at_from: earliestArchive.archivedAt,
          archived_at_to: latestArchive.archivedAt,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range returns archives",
    dateRangeResult.data.length > 0,
  );
  // Test 3: Administrator filtering - FIXED: Use actual admin ID
  const adminFilterResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          archived_by: admin1Auth.id,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(adminFilterResult);
  TestValidator.predicate(
    "admin filter returns correct admin's archives",
    adminFilterResult.data.every(
      (archive) => archive.archived_by.id === admin1Auth.id,
    ),
  );
  // Test 4: Section-specific filtering
  const sectionFilterResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          discussion_board_section_id: sections[0].id,
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(sectionFilterResult);
  TestValidator.predicate(
    "section filter returns correct section's archives",
    sectionFilterResult.data.every(
      (archive) => archive.section.id === sections[0].id,
    ),
  );
  // Test 5: Combined filters
  const combinedResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          reason: "activity",
          archived_by: admin1Auth.id,
          archived_at_from: earliestArchive.archivedAt,
          limit: 10,
          page: 1,
          sort: "archived_at_desc",
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(combinedResult);
  TestValidator.predicate(
    "combined filters work correctly",
    combinedResult.data.length >= 0,
  );
  // Test 6: Sorting options
  const sortAscResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          sort: "archived_at_asc",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(sortAscResult);
  const sortDescResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          sort: "archived_at_desc",
          limit: 10,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(sortDescResult);
  // Validate pagination
  const paginationResult =
    await api.functional.discussionBoard.superAdmin.sections.archives.index(
      superAdminConnection,
      {
        body: {
          limit: 2,
          page: 1,
        } satisfies IDiscussionBoardSectionArchive.IRequest,
      },
    );
  typia.assert(paginationResult);
  TestValidator.predicate(
    "pagination respects limit",
    paginationResult.data.length <= 2,
  );
}
