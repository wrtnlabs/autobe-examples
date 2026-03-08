import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_section_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // 2. Create section with whitespace in name to verify server trimming
  const section = await api.functional.discussionBoard.admin.sections.create(
    adminConnection,
    {
      body: {
        name: "  Politics  ",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IDiscussionBoardSection.ICreate,
    },
  );
  typia.assert(section);
  // 3. Validate business logic (typia.assert already validated all types)
  TestValidator.predicate("sequence is positive", section.sequence > 0);
  TestValidator.equals("name is trimmed", section.name, "Politics");
  TestValidator.equals(
    "creator id matches admin",
    section.creator.id,
    admin.id,
  );
  TestValidator.equals(
    "creator email matches admin",
    section.creator.email,
    admin.email,
  );
  TestValidator.equals(
    "creator displayName matches admin",
    section.creator.displayName,
    admin.displayName,
  );
  TestValidator.equals(
    "creator grade matches admin",
    section.creator.grade,
    admin.grade,
  );
  TestValidator.equals(
    "creator banned matches admin",
    section.creator.banned,
    admin.bannedAt !== null,
  );
}
