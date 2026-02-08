import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log } from "../../../generate/generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_admin_log } from "../../../prepare/prepare_random_discussion_board_section_admin_log";

export async function test_api_administrator_section_admin_log_update_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new administrator and create an authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_administrator_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdministrator.IJoin>(),
  });
  typia.assert(joinResponse);
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = joinResponse.token.access;
  // 2. Create a discussion board section
  let sectionRaw =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      { body: undefined },
    );
  const section = typia.assert<IDiscussionBoardSection & { id: string }>(sectionRaw);
  // 3. Create an admin log entry for the section
  let adminLogRaw =
    await generate_random_discussion_board_administrator_sections_admin_logs_create_admin_log(
      adminConnection,
      {
        params: { sectionId: section.id },
        body: undefined,
      },
    );
  const adminLog = typia.assert<IDiscussionBoardSectionAdminLog & { id: string; actionType: string; note: string; administratorId: string; sectionId: string; createdAt: string; updatedAt: string }>(adminLogRaw);
  // 4. Update the admin log entry's actionType and note
  const updatedActionType = RandomGenerator.name(1);
  const updatedNote = RandomGenerator.paragraph({ sentences: 2 });
  const updatedAdminLogRaw =
    await api.functional.discussionBoard.administrator.sections.adminLogs.updateAdminLog(
      adminConnection,
      {
        sectionId: section.id,
        adminLogId: adminLog.id,
        body: {
          actionType: updatedActionType,
          note: updatedNote,
        } satisfies IDiscussionBoardSectionAdminLog.IUpdate,
      },
    );
  const updatedAdminLog = typia.assert<IDiscussionBoardSectionAdminLog & { id: string; actionType: string; note: string; administratorId: string; sectionId: string; createdAt: string; updatedAt: string }>(updatedAdminLogRaw);
  // 5. Validate updated fields
  TestValidator.equals(
    "actionType updated",
    updatedAdminLog.actionType,
    updatedActionType,
  );
  TestValidator.equals("note updated", updatedAdminLog.note, updatedNote);
  // 6. Validate immutable fields are unchanged
  TestValidator.equals(
    "adminId unchanged",
    updatedAdminLog.administratorId,
    adminLog.administratorId,
  );
  TestValidator.equals(
    "sectionId unchanged",
    updatedAdminLog.sectionId,
    adminLog.sectionId,
  );
  TestValidator.equals(
    "createdAt unchanged",
    updatedAdminLog.createdAt,
    adminLog.createdAt,
  );
  TestValidator.predicate(
    "updatedAt changed",
    updatedAdminLog.updatedAt !== adminLog.updatedAt,
  );
  TestValidator.equals("id unchanged", updatedAdminLog.id, adminLog.id);
  TestValidator.predicate(
    "updatedAt is ISO string",
    typeof updatedAdminLog.updatedAt === "string" &&
      updatedAdminLog.updatedAt.length > 0,
  );
}
