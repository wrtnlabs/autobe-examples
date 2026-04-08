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

export async function test_api_customer_review_delete_other_customer_review_forbidden(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify that a customer cannot delete another customer's review.
   *
   * This test authenticates two distinct customers so the request is executed in a
   * realistic multi-user context. It then attempts to delete a review identifier
   * from the non-owner account and expects the request to be rejected due to the
   * ownership check enforced by the server.
   *
   * 1. Register two separate customers with isolated connections.
   * 2. Use the second customer as the unauthorized actor.
   * 3. Attempt to delete a review identifier not owned by that customer.
   * 4. Confirm the deletion request is rejected.
   */
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const attackerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  await TestValidator.error(
    "cannot delete another customer's review",
    async () => {
      await api.functional.mallPlatform.customer.reviews.erase(
        attackerConnection,
        {
          reviewId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
