import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test error handling when attempting to retrieve a section archive with non-existent section ID or archive ID.
 * This scenario validates that the system properly handles invalid UUIDs and non-existent records by returning appropriate error responses.
 */
export async function test_api_section_archive_retrieval_with_nonexistent_ids(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test 1: Valid UUID format but non-existent sectionId
  await TestValidator.httpError(
    "non-existent section UUID",
    [404, 400],
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          archiveId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 2: Valid UUID format but non-existent archiveId
  await TestValidator.httpError(
    "non-existent archive UUID",
    [404, 400],
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          archiveId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 3: Both UUIDs are valid format but completely non-existent
  await TestValidator.httpError(
    "both UUIDs non-existent",
    [404, 400],
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          archiveId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // Test 4: Reuse same non-existent UUIDs to test consistency
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentArchiveId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "consistent non-existent section ID",
    [404, 400],
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        {
          sectionId: nonExistentSectionId,
          archiveId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  await TestValidator.httpError(
    "consistent non-existent archive ID",
    [404, 400],
    async () => {
      await api.functional.discussionBoard.superAdmin.sections.archives.at(
        superAdminConnection,
        {
          sectionId: typia.random<string & tags.Format<"uuid">>(),
          archiveId: nonExistentArchiveId,
        },
      );
    },
  );
}
