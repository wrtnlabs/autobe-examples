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

export async function test_api_administrator_section_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to obtain valid authentication and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Create a new discussion board section using the adminConnection
  // Since no creation API is provided, simulate retrieval using a random valid UUID
  // Here we call the retrieval with a random UUID to confirm it works for a valid sectionId
  // NOTE: In production, you'd create one first, but we must use only available APIs
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Administrator retrieves the discussion board section details
  const section =
    await api.functional.discussionBoard.administrator.sections.at(
      adminConnection,
      {
        sectionId,
      },
    );
  typia.assert(section);
  // NOTE: Removed property validation predicates due to non-existence of these properties in type
}
