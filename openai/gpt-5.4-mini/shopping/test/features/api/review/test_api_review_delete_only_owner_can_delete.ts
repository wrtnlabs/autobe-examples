import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_delete_only_owner_can_delete(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const attackerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await authorize_customer_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/signup",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-owner customer cannot delete another customer's review",
    async () => {
      await api.functional.mallPlatform.customer.reviews.erase(
        attackerConnection,
        {
          reviewId,
        },
      );
    },
  );
}
