import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdmin";
import type { IEconPoliticBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardAdminRequest";
import type { IEconPoliticBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardArticle";
import type { IEconPoliticBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardMember";
import type { IEconPoliticBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_econ_politic_board_admin_articles_create } from "../../../generate/generate_random_econ_politic_board_admin_articles_create";
import { generate_random_econ_politic_board_admin_sections_create } from "../../../generate/generate_random_econ_politic_board_admin_sections_create";
import { prepare_random_econ_politic_board_article } from "../../../prepare/prepare_random_econ_politic_board_article";
import { prepare_random_econ_politic_board_section } from "../../../prepare/prepare_random_econ_politic_board_section";

export async function test_api_admin_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    },
  });
  // Step 2: Create a section
  const section =
    await generate_random_econ_politic_board_admin_sections_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  // Step 3: Create an article using the section
  const article =
    await generate_random_econ_politic_board_admin_articles_create(
      adminConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 3 }),
          sectionId: section.id,
          tags: [
            RandomGenerator.paragraph({ sentences: 1 }),
            RandomGenerator.paragraph({ sentences: 1 }),
          ],
        },
      },
    );
  // Step 4: Retrieve an admin request
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const adminRequest = await api.functional.econPoliticBoard.admin.requests.at(
    adminConnection,
    {
      requestId,
    },
  );
  // Step 5: Validate the admin request
  typia.assert(adminRequest);
  TestValidator.equals("requestId should match", adminRequest.id, requestId);
  TestValidator.equals(
    "admin ID should match",
    adminRequest.admin.id,
    admin.id,
  );
  TestValidator.equals(
    "requestType should be valid",
    adminRequest.requestType,
    "article_creation",
  );
  TestValidator.equals(
    "status should be valid",
    adminRequest.status,
    "pending",
  );
  TestValidator.equals("user ID should match", adminRequest.user.id, admin.id);
}
