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

export async function test_api_review_own_delete_preserves_snapshot(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const reviewId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "deleting a non-existent review should be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.reviews.erase(
        customerConnection,
        {
          reviewId,
        },
      );
    },
  );
  await TestValidator.httpError(
    "repeated delete should also be rejected",
    [400, 401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.reviews.erase(
        customerConnection,
        {
          reviewId,
        },
      );
    },
  );
}
