import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
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
import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";
import { generate_random_discussion_board_administrator_sections_create } from "../../../generate/generate_random_discussion_board_administrator_sections_create";
import { prepare_random_discussion_board_section } from "../../../prepare/prepare_random_discussion_board_section";

export async function test_api_section_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin account setup: join and login
  const adminConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
    },
  });
  typia.assert(adminJoin);
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: adminJoin.email,
      password: joinPassword,
      href: "https://localhost/login",
      referrer: "https://localhost/home",
      ip: null,
    },
  });
  typia.assert(adminLogin);
  // Use the adminConnection authenticated with login tokens
  // (the authorize_administrator_login function updates the connection headers internally)
  // 2. Create two distinct discussion board sections
  const section1 =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: { name: `${RandomGenerator.name()}-unique-sect1` },
      },
    );
  typia.assert(section1);
  const section2 =
    await generate_random_discussion_board_administrator_sections_create(
      adminConnection,
      {
        body: { name: `${RandomGenerator.name()}-unique-sect2` },
      },
    );
  typia.assert(section2);
  // 3. Attempt to update section2's name to section1's name, expecting 409 error
  const updateBody = {
    name: section1.name,
  } satisfies IDiscussionBoardSection.IUpdate;
  await TestValidator.httpError(
    "duplicate section name conflict",
    409,
    async () => {
      await api.functional.discussionBoard.registeredUser.sections.updateSection(
        adminConnection,
        {
          sectionId: section2.id,
          body: updateBody,
        },
      );
    },
  );
  // 4. Confirm section2's name remains unchanged by fetching the section (assuming no fetch function; we rely on creating a second section and confirm no error)
  // Since NO GET section endpoint provided, we confirm the update failure ensures no name change.
}
