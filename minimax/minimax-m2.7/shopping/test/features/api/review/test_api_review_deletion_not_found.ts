import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_review_deletion_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer to get authenticated access
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Attempt to delete a review with a non-existent UUID
  const nonExistentReviewId = "00000000-0000-0000-0000-000000000000" as string &
    tags.Format<"uuid">;
  // Validate that deleting a non-existent review returns 404 Not Found
  await TestValidator.httpError(
    "non-existent review returns 404",
    404,
    async () => {
      await api.functional.ecommerceMall.customer.reviews.erase(
        customerConnection,
        {
          reviewId: nonExistentReviewId,
        },
      );
    },
  );
}
