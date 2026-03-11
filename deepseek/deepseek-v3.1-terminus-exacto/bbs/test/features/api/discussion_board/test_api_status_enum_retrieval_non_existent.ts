import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusEnum } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusEnum";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test handling of non-existent status enumeration retrieval.
 *
 * As an authenticated super administrator, attempt to retrieve a status enum
 * using a randomly generated UUID that does not exist in the system. The system
 * should respond with a 404 Not Found error with appropriate error message
 * indicating that the status enumeration could not be found.
 */
export async function test_api_status_enum_retrieval_non_existent(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Generate a random UUID that doesn't exist in the system
  const nonExistentStatusEnumId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent status enum and validate 404 error
  await TestValidator.httpError(
    "retrieving non-existent status enum should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.superAdmin.status_enums.at(
        superAdminConnection,
        {
          statusEnumId: nonExistentStatusEnumId,
        },
      );
    },
  );
}
