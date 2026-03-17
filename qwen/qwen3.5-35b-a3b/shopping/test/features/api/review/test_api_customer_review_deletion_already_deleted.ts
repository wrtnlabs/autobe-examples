import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_review_deletion_already_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - use utility function for customer join
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Attempt to delete an already deleted review
  // Use a fixed UUID for a review that is already deleted
  const alreadyDeletedReviewId: string & tags.Format<"uuid"> =
    "00000000-0000-0000-0000-000000000001";
  // Validate that deletion of already deleted review returns 404 Not Found
  await TestValidator.httpError(
    "already deleted review should return 404 Not Found",
    [404],
    async () => {
      await api.functional.ecommerceMall.customer.reviews.erase(
        customerConnection,
        { reviewId: alreadyDeletedReviewId },
      );
    },
  );
}
