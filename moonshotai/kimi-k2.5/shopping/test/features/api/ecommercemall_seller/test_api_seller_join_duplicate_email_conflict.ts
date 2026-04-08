import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_join_duplicate_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Generate a random email that will be used for both registrations
  const duplicateEmail = typia.random<string & tags.Format<"email">>();
  // Step 2: Create first seller successfully with the email
  const firstConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstConnection, {
    body: {
      email: duplicateEmail,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstSeller);
  // Step 3: Attempt to create second seller with same email - should fail with 409 Conflict
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () => {
      await authorize_seller_join(secondConnection, {
        body: {
          email: duplicateEmail,
          password: typia.random<string & tags.Format<"password">>(),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
