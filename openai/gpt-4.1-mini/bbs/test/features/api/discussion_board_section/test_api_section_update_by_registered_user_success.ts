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

export async function test_api_section_update_by_registered_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Registered user join
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUserJoin = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234",
      },
    },
  );
  typia.assert(registeredUserJoin);
  // 2. Registered user login for actor switching
  const registeredUserLoginConnection: api.IConnection = {
    host: connection.host,
  };
  const registeredUserLogin = await authorize_registered_user_login(
    registeredUserLoginConnection,
    { body: { email: registeredUserJoin.email, password: "password1234" } },
  );
  typia.assert(registeredUserLogin);
  // 3. Administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "adminpass1234",
    },
  });
  typia.assert(adminJoin);
  // 4. Administrator login for actor switching
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLogin = await authorize_administrator_login(adminLoginConnection, {
    body: {
      email: adminJoin.email,
      password: "adminpass1234",
      href: "http://example.com/admin-login",
      referrer: "http://example.com/admin",
      ip: null,
    },
  });
  typia.assert(adminLogin);
  // 5. Administrator creates a new section
  const newSection =
    await generate_random_discussion_board_administrator_sections_create(
      adminLoginConnection,
      {},
    );
  typia.assert(newSection);
  // 6. Registered user updates the section
  const updatedName = RandomGenerator.name(2);
  const updatedDescription = RandomGenerator.paragraph({ sentences: 3 });
  const updateBody: IDiscussionBoardSection.IUpdate = {
    name: updatedName,
    description: updatedDescription,
  };
  const updatedSection =
    await api.functional.discussionBoard.registeredUser.sections.updateSection(
      registeredUserLoginConnection,
      {
        sectionId: newSection.id,
        body: updateBody,
      },
    );
  typia.assert(updatedSection);
  // 7. Validate updated content
  TestValidator.equals(
    "section name updated",
    updatedSection.name,
    updateBody.name,
  );
  TestValidator.equals(
    "section description updated",
    updatedSection.description,
    updateBody.description,
  );
  // 8. Validate timestamps are consistent and updatedAt is changed
  TestValidator.predicate(
    "createdAt is iso string",
    typeof updatedSection.createdAt === "string" &&
      updatedSection.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is iso string",
    typeof updatedSection.updatedAt === "string" &&
      updatedSection.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null",
    updatedSection.deletedAt === null,
  );
  // Ensure updatedAt is later than or equal to createdAt
  TestValidator.predicate(
    "updatedAt is equal or later than createdAt",
    new Date(updatedSection.updatedAt).getTime() >=
      new Date(updatedSection.createdAt).getTime(),
  );
}
