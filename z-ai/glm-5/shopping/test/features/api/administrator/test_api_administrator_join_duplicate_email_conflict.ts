import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Generate a unique email address for testing duplicate registration
  const email = typia.random<string & tags.Format<"email">>();
  // Step 1: Create first administrator account - this should succeed
  const firstConnection: api.IConnection = { host: connection.host };
  const firstAdmin = await authorize_administrator_join(firstConnection, {
    body: {
      email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(firstAdmin);
  // Step 2: Attempt to create second administrator with the same email - expect 409 Conflict
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate administrator email should return 409 Conflict",
    409,
    async () => {
      await authorize_administrator_join(secondConnection, {
        body: {
          email, // Same email as first administrator
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        },
      });
    },
  );
}
