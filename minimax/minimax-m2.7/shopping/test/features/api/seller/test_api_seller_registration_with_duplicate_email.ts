import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_registration_with_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller with a unique email
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const firstSellerConnection: api.IConnection = { host: connection.host };
  const firstSeller = await authorize_seller_join(firstSellerConnection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstSeller);
  // Validate first registration succeeded
  TestValidator.equals(
    "first seller approval status is pending",
    firstSeller.approvalStatus,
    "pending",
  );
  TestValidator.equals("email matches input", firstSeller.email, sellerEmail);
  // 2. Attempt to register second seller with SAME email - expect 409 Conflict
  await TestValidator.httpError(
    "duplicate email should return 409 Conflict",
    409,
    async () => {
      const duplicateConnection: api.IConnection = { host: connection.host };
      await authorize_seller_join(duplicateConnection, {
        body: {
          email: sellerEmail,
          password: RandomGenerator.alphaNumeric(16),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
}
