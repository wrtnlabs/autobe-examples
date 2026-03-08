import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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
import { generate_random_discussion_board_super_admin_sections_create } from "../../../generate/generate_random_discussion_board_super_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(adminConnection, {
    body: typia.random<IDiscussionBoardSuperAdmin.IJoin>(),
  });
  // 2. Create a test section
  const createdSection =
    await api.functional.discussionBoard.superAdmin.sections.create(
      adminConnection,
      {
        body: typia.random<IDiscussionBoardSection.ICreate>(),
      },
    );
  typia.assert(createdSection);
  // 3. Retrieve the section by ID
  const retrievedSection = await api.functional.discussionBoard.sections.at(
    adminConnection,
    {
      sectionId: createdSection.id,
    },
  );
  typia.assert(retrievedSection);
  // 4. Validate the retrieved section matches the created section
  TestValidator.equals(
    "retrieved section matches created section",
    retrievedSection,
    createdSection,
  );
}
