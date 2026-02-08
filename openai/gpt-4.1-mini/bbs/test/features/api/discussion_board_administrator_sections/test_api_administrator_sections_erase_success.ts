import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_sections_erase_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Create a section to erase - Since there is no utility or direct API for section creation, we use a random valid UUID for sectionId
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // 3. Delete the section
  await api.functional.discussionBoard.administrator.sections.erase(
    adminConnection,
    { sectionId },
  );
  // 4. Idempotency test: delete again, expect same success with no error
  await api.functional.discussionBoard.administrator.sections.erase(
    adminConnection,
    { sectionId },
  );
  // Note: Verification of related articles' inaccessibility and audit logs creation
  // is omitted because no API or utility is available for checking those.
}
