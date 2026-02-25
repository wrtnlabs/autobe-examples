import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
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
import { generate_random_discussion_board_admin_sections_create } from "../../../generate/generate_random_discussion_board_admin_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_deletion_by_regular_admin_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create regular administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234!@#$",
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuthorized = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: adminJoinInput,
    },
  );
  typia.assert(adminAuthorized);
  // Login as regular admin (creates session)
  const adminLoginInput = {
    email: adminJoinInput.email,
    password: adminJoinInput.password,
  } satisfies IDiscussionBoardAdmin.ILogin;
  await api.functional.discussionBoard.auth.admin.login(adminConnection, {
    body: adminLoginInput,
  });
  // Verify this is NOT a super admin
  TestValidator.predicate(
    "regular admin (not super)",
    !adminAuthorized.is_super_admin,
  );
  // 2. Create a section as regular admin
  const sectionInput = {
    name: `Test Section ${RandomGenerator.alphaNumeric(6)}`,
    description: "Section for testing authorization",
  } satisfies IDiscussionBoardSection.ICreate;
  const createdSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: sectionInput,
      },
    );
  typia.assert(createdSection);
  // 3. Attempt to delete section as regular admin (should fail)
  await TestValidator.error("permission denied for regular admin", async () => {
    await api.functional.discussionBoard.superAdmin.sections.erase(
      adminConnection,
      {
        sectionId: createdSection.id,
      },
    );
  });
  // 4. Verify section still exists in database by fetching it
  const fetchedSection =
    await api.functional.discussionBoard.admin.sections.create(
      adminConnection,
      {
        body: sectionInput,
      },
    );
  typia.assert(fetchedSection);
  TestValidator.equals(
    "section still exists",
    fetchedSection.id,
    createdSection.id,
  );
}
