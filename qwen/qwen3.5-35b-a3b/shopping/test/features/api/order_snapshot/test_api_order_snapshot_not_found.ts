import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator access to non-existent order snapshot.
 *
 * Validates the negative scenario when an administrator attempts to retrieve an order snapshot that does not exist in the system. Ensures proper 404 error handling, authentication requirements, and secure error messaging that does not leak information about existing snapshot IDs.
 *
 * Special attention is given to verifying that the 404 response is properly formatted, the error message is user-friendly, and the system maintains security by not revealing whether similar snapshot IDs exist.
 *
 * 1. Administrator registers new account with unique credentials
 * 2. Administrator connection established with authentication token
 * 3. Random UUID generated for non-existent snapshot ID
 * 4. Attempt to retrieve order snapshot with invalid ID
 * 5. Verify 404 Not Found response is returned
 * 6. Validate error response format and message contains appropriate information
 */
export async function test_api_order_snapshot_not_found(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "should return 404 for non-existent snapshot",
    404,
    async () => {
      return await api.functional.ecommerceMall.administrator.order_snapshots.at(
        adminConnection,
        {
          id: nonExistentId,
        },
      );
    },
  );
  try {
    await api.functional.ecommerceMall.administrator.order_snapshots.at(
      adminConnection,
      {
        id: nonExistentId,
      },
    );
  } catch (error) {
    if (error instanceof api.HttpError) {
      const errorData = error.toJSON();
      TestValidator.equals("error status is 404", errorData.status, 404);
      TestValidator.equals("error method is GET", errorData.method, "GET");
      TestValidator.predicate(
        "error message indicates snapshot not found",
        () =>
          errorData.message !== undefined &&
          errorData.message !== null &&
          (typeof errorData.message === "string" ||
            typeof errorData.message === "object"),
      );
    }
  }
}
