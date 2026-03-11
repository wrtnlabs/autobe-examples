import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionDeletion";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardSectionDeletion } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSectionDeletion";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_deletion_audit_filter_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create first administrator
  const admin1Connection: api.IConnection = { host: connection.host };
  const admin1 = await authorize_admin_join(admin1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create second administrator
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Create sections for deletion
  const sections = await ArrayUtil.asyncRepeat(3, async () => {
    const section =
      await generate_random_discussion_board_admin_sections_create(
        admin1Connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IDiscussionBoardSection.ICreate,
        },
      );
    typia.assert(section);
    return section;
  });
  // Delete sections with different administrators
  await api.functional.discussionBoard.admin.sections.erase(admin1Connection, {
    sectionId: sections[0].id,
  });
  await api.functional.discussionBoard.admin.sections.erase(admin2Connection, {
    sectionId: sections[1].id,
  });
  await api.functional.discussionBoard.admin.sections.erase(admin1Connection, {
    sectionId: sections[2].id,
  });
  // Test filtering by admin1 (using admin ID as member ID since administrators are also members)
  const filterByAdmin1 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          deleted_by_member_id: admin1.id,
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(filterByAdmin1);
  // Verify admin1 filter results
  TestValidator.equals("admin1 deletion count", filterByAdmin1.data.length, 2);
  TestValidator.predicate(
    "all deletions by admin1",
    filterByAdmin1.data.every(
      (deletion) => deletion.deletedByMember.id === admin1.id,
    ),
  );
  // Test filtering by admin2
  const filterByAdmin2 =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          deleted_by_member_id: admin2.id,
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(filterByAdmin2);
  // Verify admin2 filter results
  TestValidator.equals("admin2 deletion count", filterByAdmin2.data.length, 1);
  TestValidator.predicate(
    "all deletions by admin2",
    filterByAdmin2.data.every(
      (deletion) => deletion.deletedByMember.id === admin2.id,
    ),
  );
  // Test filtering by non-existent administrator
  const nonExistentFilter =
    await api.functional.discussionBoard.superAdmin.sections.deletions.index(
      superAdminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          deleted_by_member_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IDiscussionBoardSectionDeletion.IRequest,
      },
    );
  typia.assert(nonExistentFilter);
  // Verify empty result for non-existent administrator
  TestValidator.equals(
    "non-existent admin deletion count",
    nonExistentFilter.data.length,
    0,
  );
  // Test pagination metadata
  TestValidator.equals(
    "admin1 pagination records",
    filterByAdmin1.pagination.records,
    2,
  );
  TestValidator.equals(
    "admin2 pagination records",
    filterByAdmin2.pagination.records,
    1,
  );
  TestValidator.equals(
    "non-existent admin pagination records",
    nonExistentFilter.pagination.records,
    0,
  );
}
