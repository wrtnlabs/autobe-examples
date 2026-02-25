import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_login_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate test credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const name = RandomGenerator.name();
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Step 1: Create admin account (precondition)
  const joinConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(joinConnection, {
    body: {
      email,
      password,
      name,
      href,
      referrer,
      ip,
    },
  });
  // Step 2: Test login with created credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_admin_login(loginConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  // Step 3: Validate response structure
  typia.assert(authorized);
  // Step 4: Validate business rules
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("name matches", authorized.name, name);
  TestValidator.equals("grade is regular", authorized.grade, "regular");
}
