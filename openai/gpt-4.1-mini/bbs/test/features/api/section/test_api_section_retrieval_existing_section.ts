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

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_section_retrieval_existing_section(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const registeredUserConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_registered_user_join(
    registeredUserConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      },
    },
  );
  registeredUserConnection.headers = {
    ...registeredUserConnection.headers,
    Authorization: registeredUser.token.access,
  };
  // 2. Because no API to list existing sections is available, we attempt
  // to fetch an existing section by retrying random UUIDs until a valid
  // section is found.
  async function findValidSectionId(): Promise<string> {
    for (let i = 0; i < 5; ++i) {
      try {
        const candidateId = typia.random<string & tags.Format<"uuid">>();
        const section =
          await api.functional.discussionBoard.registeredUser.sections.at(
            registeredUserConnection,
            { sectionId: candidateId },
          );
        typia.assert(section);
        return candidateId;
      } catch {
        // ignore and retry
      }
    }
    throw new Error("No valid section found after 5 attempts");
  }
  const validSectionId = await findValidSectionId();
  // 3. Call the section details endpoint with valid sectionId
  const section =
    await api.functional.discussionBoard.registeredUser.sections.at(
      registeredUserConnection,
      {
        sectionId: validSectionId,
      },
    );
  typia.assert(section);
  // 4. Assertions
  TestValidator.predicate(
    "section has valid id",
    typeof section.id === "string" && section.id.length > 0,
  );
  TestValidator.predicate(
    "section name exists",
    typeof section.name === "string" && section.name.length > 0,
  );
  TestValidator.predicate(
    "section description exists",
    typeof section.description === "string",
  );
  TestValidator.predicate(
    "section createdAt is date-time",
    typeof section.createdAt === "string",
  );
  TestValidator.predicate(
    "section updatedAt is date-time",
    typeof section.updatedAt === "string",
  );
  TestValidator.predicate(
    "section adminLogs is array",
    Array.isArray(section.adminLogs),
  );
  TestValidator.predicate(
    "section articles is array",
    Array.isArray(section.articles),
  );
  // 5. Confirm the response matches full schema
  typia.assert(section);
}
