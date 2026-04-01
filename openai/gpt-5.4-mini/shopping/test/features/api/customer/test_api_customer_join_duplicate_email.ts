import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const password1 = RandomGenerator.alphaNumeric(16);
  const password2 = RandomGenerator.alphaNumeric(16);
  const firstConnection: api.IConnection = { host: connection.host };
  const first = await authorize_customer_join(firstConnection, {
    body: {
      email,
      password: password1,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(first);
  const firstSnapshot = {
    id: first.id,
    email: first.email,
    status: first.status,
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
    deletedAt: first.deletedAt,
    token: {
      access: first.token.access,
      refresh: first.token.refresh,
      expired_at: first.token.expired_at,
      refreshable_until: first.token.refreshable_until,
    },
  } satisfies IMallPlatformCustomer.IAuthorized;
  const secondConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate customer email should be rejected",
    async () => {
      await authorize_customer_join(secondConnection, {
        body: {
          email,
          password: password2,
        } satisfies IMallPlatformCustomer.IJoin,
      });
    },
  );
  TestValidator.equals(
    "original registration remains unchanged",
    first,
    firstSnapshot,
  );
  TestValidator.equals("original email preserved", first.email, email);
}
