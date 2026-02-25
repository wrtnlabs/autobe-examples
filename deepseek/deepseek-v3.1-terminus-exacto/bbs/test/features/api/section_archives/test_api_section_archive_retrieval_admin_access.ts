import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionArchive } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionArchive";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_discussion_board_admin_sections_archives_create } from "../../../generate/generate_random_discussion_board_admin_sections_archives_create";
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";
import { prepare_random_discussion_board_section_archive } from "../../../prepare/prepare_random_discussion_board_section_archive";

export async function test_api_section_archive_retrieval_admin_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a section to archive
  const section = await generate_random_discussion_board_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "active",
        display_order: typia.random<number & tags.Type<"int32">>(),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Archive the section
  const archive =
    await api.functional.discussionBoard.admin.sections.archives.create(
      adminConnection,
      {
        sectionId: section.id,
        body: {
          reason: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IDiscussionBoardSectionArchive.ICreate,
      },
    );
  typia.assert(archive);
  // 4. Retrieve the archive record
  const retrievedArchive =
    await api.functional.discussionBoard.admin.sections.archives.at(
      adminConnection,
      {
        archiveId: archive.id,
      },
    );
  typia.assert(retrievedArchive);
  // 5. Validate archive metadata
  TestValidator.equals("archive ID matches", retrievedArchive.id, archive.id);
  TestValidator.equals(
    "section ID matches",
    retrievedArchive.sectionId,
    section.id,
  );
  TestValidator.predicate(
    "has archival timestamp",
    retrievedArchive.archivedAt !== "",
  );
  TestValidator.predicate(
    "has archival reason",
    retrievedArchive.reason.length > 0,
  );
  TestValidator.equals(
    "archival admin ID matches",
    retrievedArchive.archivedBy,
    admin.id,
  );
  // 6. Validate section summary
  TestValidator.equals(
    "section summary ID matches",
    retrievedArchive.section.id,
    section.id,
  );
  TestValidator.equals(
    "section summary name matches",
    retrievedArchive.section.name,
    section.name,
  );
  TestValidator.equals(
    "section summary description matches",
    retrievedArchive.section.description,
    section.description,
  );
  TestValidator.predicate(
    "section summary has status",
    retrievedArchive.section.status !== undefined,
  );
  TestValidator.predicate(
    "section summary has display order",
    retrievedArchive.section.display_order !== undefined,
  );
}
