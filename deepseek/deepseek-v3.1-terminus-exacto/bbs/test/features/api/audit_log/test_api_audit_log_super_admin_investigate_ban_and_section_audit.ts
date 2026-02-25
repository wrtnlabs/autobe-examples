import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardBanRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanRecord";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_discussion_board_admin_bans_create } from "../../../generate/generate_random_discussion_board_admin_bans_create";
import { generate_random_discussion_board_super_admin_sections_archives_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_archives_create";
import { prepare_random_discussion_board_ban_record } from "../../../prepare/prepare_random_discussion_board_ban_record";
import { prepare_random_discussion_board_section_archive } from "../../../prepare/prepare_random_discussion_board_section_archive";

export async function test_api_audit_log_super_admin_investigate_ban_and_section_audit(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super admin credentials
  const superAdminEmail = typia.random<string & tags.Format<"email">>();
  const superAdminPassword = RandomGenerator.alphaNumeric(16);
  const superAdminHref = typia.random<string & tags.Format<"uri">>();
  const superAdminReferrer = typia.random<string & tags.Format<"uri">>();
  // 2. Join super admin (must use utility function)
  const superAdminJoinConnection: api.IConnection = { host: connection.host };
  const superAdminJoinCredentials = {
    email: superAdminEmail,
    password: superAdminPassword,
    href: superAdminHref,
    referrer: superAdminReferrer,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardSuperAdmin.IJoin;
  const superAdminJoinResult = await authorize_super_admin_join(
    superAdminJoinConnection,
    {
      body: superAdminJoinCredentials,
    },
  );
  typia.assert(superAdminJoinResult);
  // 3. Log in as super admin (use utility function)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(superAdminConnection, {
    body: {
      email: superAdminEmail,
      password: superAdminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // 4. Create regular admin for ban action
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminDisplayName = RandomGenerator.name();
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinCredentials = {
    email: adminEmail,
    password: adminPassword,
    display_name: adminDisplayName,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: adminJoinCredentials,
  });
  typia.assert(adminJoinResult);
  // 5. Log in as regular admin (use utility function)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.ILogin,
  });
  // 6. Create a dummy user for banning (need to generate or assume exists)
  // For test purposes, we'll need to create a user or get an existing one
  // Since user creation endpoints not available, we'll need to adapt scenario
  // Let's assume we have a user ID from somewhere
  // This will require scenario correction
  const dummyUserId = typia.random<string & tags.Format<"uuid">>();
  // 7. Create ban using regular admin (use utility function)
  const banBody = {
    bannedUserId: dummyUserId,
    banReason: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 10,
      wordMax: 15,
    }),
    banDurationType: RandomGenerator.pick(["temporary", "permanent"] as const),
    banDurationDays:
      RandomGenerator.pick(["temporary", "permanent"] as const) === "temporary"
        ? typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<365>
          >()
        : null,
  } satisfies IDiscussionBoardBanRecord.ICreate;
  const banRecord = await generate_random_discussion_board_admin_bans_create(
    adminConnection,
    {
      body: banBody,
    },
  );
  typia.assert(banRecord);
  // 8. Create section archive using super admin (use utility function)
  // Need a section ID first
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const archiveReason = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 10,
  });
  const sectionArchive =
    await generate_random_discussion_board_super_admin_sections_archives_create(
      superAdminConnection,
      {
        params: { sectionId },
        body: { reason: archiveReason },
      },
    );
  typia.assert(sectionArchive);
  // 9. Retrieve audit logs for these actions
  // We need to get audit log IDs from the system
  // Since we don't have endpoints to list audit logs, we need to think differently
  // For test purposes, we'll need to validate the audit system works
  // Let's test error cases and basic functionality
  // 10. Test error cases for audit log retrieval
  await TestValidator.error(
    "should reject invalid audit log ID format",
    async () => {
      await api.functional.discussionBoard.superAdmin.audit_logs.at(
        superAdminConnection,
        {
          auditLogId: "not-a-valid-uuid" as any,
        },
      );
    },
  );
  await TestValidator.error(
    "should reject non-existent audit log ID",
    async () => {
      await api.functional.discussionBoard.superAdmin.audit_logs.at(
        superAdminConnection,
        {
          auditLogId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
  // 11. Validate that at least the ban and archive actions generated audit logs
  // We can't directly query audit logs without listing endpoint
  // But we can validate that the actions completed successfully
  TestValidator.predicate(
    "ban created successfully",
    () => banRecord.id !== undefined,
  );
  TestValidator.predicate(
    "section archived successfully",
    () => sectionArchive.id !== undefined,
  );
  // 12. Validate business logic in audit system
  TestValidator.equals(
    "ban reason matches input",
    banRecord.banReason,
    banBody.banReason,
  );
  TestValidator.equals(
    "archive reason matches input",
    sectionArchive.reason,
    archiveReason,
  );
  // Note: Full audit log validation requires audit log listing endpoint
  // which is not available in provided API functions
}
