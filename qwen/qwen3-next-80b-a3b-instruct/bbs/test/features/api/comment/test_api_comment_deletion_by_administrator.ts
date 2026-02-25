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

export async function test_api_comment_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Generate valid administrator credentials
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IEconomicBoardAdministrator.IJoin;
  // Authenticate as administrator using the provided utility function
  const adminLoginResponse = await authorize_administrator_join(
    adminConnection,
    { body: adminCredentials },
  );
  typia.assert(adminLoginResponse);
  // Generate a random comment ID to attempt deletion
  // Since we cannot create a comment or article with provided APIs,
  // we must test deletion with a potentially valid but unknown ID
  const commentId = typia.random<string & tags.Format<"uuid">>();
  // Execute comment deletion as administrator
  await api.functional.economicBoard.administrator.comments.erase(
    adminConnection,
    {
      id: commentId,
    },
  );
  // Since the API returns void and we cannot verify the outcome through the provided SDK (no list function for comments),
  // we rely on the fact that the operation should complete successfully without error
  // for a valid comment ID. In a real test suite, we would verify the comment is no longer accessible,
  // but with the given constraints we can only validate that the API call succeeds.
}
