import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_discussion_board_super_administrator_sections_create } from "../../../generate/generate_random_discussion_board_super_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_creation_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Attempt to create a new section with a name that already exists to test uniqueness constraint enforcement.
  // Confirm the API returns proper error response indicating conflict due to duplicate section name.
  // Authorization using superAdministrator join is required before this operation.
  // 1. Super Administrator Join and create a new section
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & typia.tags.Format<"email">>(),
        password: "Password1234!",
        href: "https://example.com",
        referrer: "https://referrer.com",
        ip: null,
      },
    },
  );
  // The superAdminConnection now has Authorization header set by authorize_super_administrator_join
  // 2. Create one section
  const existingSection =
    await generate_random_discussion_board_super_administrator_sections_create(
      superAdminConnection,
      {},
    );
  typia.assert(existingSection);
  // 3. Attempt to create second section with the same name to trigger conflict
  const duplicateSectionBody: IDiscussionBoardSection.ICreate = {
    name: existingSection.name,
    description: existingSection.description + " Duplicate attempt",
  };
  // 4. Validate that creating section with duplicate name raises error
  await TestValidator.error(
    "section creation with duplicate name should fail",
    async () => {
      await generate_random_discussion_board_super_administrator_sections_create(
        superAdminConnection,
        {
          body: duplicateSectionBody,
        },
      );
    },
  );
}
