import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
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
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_discussion_board_administrator_section_update_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IDiscussionBoardAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: `admin${Date.now()}@test.com` satisfies string &
          tags.Format<"email">,
        password: "strong_password_1234",
      },
    });
  adminConnection.headers = { Authorization: adminAuth.token.access };
  // 2. Create first section with unique name
  const firstSectionName = `section-${Date.now()}-alpha`;
  const firstSectionDescription = "First section description";
  const firstSection: IDiscussionBoardSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: firstSectionName,
          description: firstSectionDescription,
        },
      },
    );
  typia.assert(firstSection);
  // 3. Create second section with different name
  const secondSectionName = `section-${Date.now()}-beta`;
  const secondSectionDescription = "Second section description";
  const secondSection: IDiscussionBoardSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: {
          name: secondSectionName,
          description: secondSectionDescription,
        },
      },
    );
  typia.assert(secondSection);
  // 4. Attempt to update second section's name to first section's name (conflict)
  const updateBody: IDiscussionBoardSection.IUpdate = {
    name: firstSectionName,
  };
  await TestValidator.httpError(
    "conflict error on duplicate section name",
    409,
    async () => {
      await api.functional.discussionBoard.administrator.sections.updateSection(
        adminConnection,
        {
          sectionId: secondSection.id,
          body: updateBody,
        },
      );
    },
  );
  // 5. Authorization failure scenario: non-admin cannot update section
  const nonAdminConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized update section by non-admin",
    401,
    async () => {
      const randomName = RandomGenerator.name() || "defaultName";
      await api.functional.discussionBoard.administrator.sections.updateSection(
        nonAdminConnection,
        {
          sectionId: firstSection.id,
          body: { name: randomName },
        },
      );
    },
  );
}
