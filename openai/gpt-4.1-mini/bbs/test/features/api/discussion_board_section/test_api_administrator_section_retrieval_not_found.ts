import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_section_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator joins to obtain valid authentication and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  adminConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2. Create a random UUID that does not exist
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to get the non-existent section and expect HTTP 404 error
  await TestValidator.httpError("section not found", 404, async () => {
    await api.functional.discussionBoard.administrator.sections.at(
      adminConnection,
      {
        sectionId: nonExistentSectionId,
      },
    );
  });
}
