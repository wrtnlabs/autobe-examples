import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_pending_approval_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a separate connection for seller operations
  const sellerConnection: api.IConnection = { host: connection.host };
  // Step 1: Generate seller registration data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!@#",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallSeller.IJoin;
  // Step 2: Register seller account (automatically in pending approval state)
  await authorize_seller_join(sellerConnection, { body: joinInput });
  // Step 3: Attempt login with pending seller credentials (should be rejected)
  await TestValidator.error(
    "login rejected for pending approval seller",
    async () => {
      const loginInput = {
        email: joinInput.email,
        password: joinInput.password,
      } satisfies IEcommerceMallSeller.ILogin;
      await authorize_seller_login(sellerConnection, { body: loginInput });
    },
  );
}
