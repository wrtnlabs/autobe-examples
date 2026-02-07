import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_section_deletion_for_nonexistent_section(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
    } satisfies IEconomicBoardAdministrator.ILogin,
  });
  // Generate a non-existent section UUID (valid format, but never created)
  const nonExistentSectionId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete a non-existent section - should return 404 Not Found
  await TestValidator.httpError(
    "deleting nonexistent section should return 404",
    404,
    async () => {
      await api.functional.economicBoard.administrator.sections.erase(
        adminConnection,
        {
          sectionId: nonExistentSectionId,
        },
      );
    },
  );
}
