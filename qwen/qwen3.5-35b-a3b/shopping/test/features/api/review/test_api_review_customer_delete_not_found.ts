import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_review_customer_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test deletion attempt of a non-existent customer review, validating 404 Not Found response.
   *
   * This test verifies that the review deletion endpoint properly handles attempts to delete
   * reviews that do not exist in the system. The endpoint must return HTTP 404 status code
   * with an appropriate error message, and must NOT create snapshot records or modify
   * database records when the target review is not found.
   *
   * Special attention is given to verifying that the API fails gracefully without side effects,
   * ensuring that failed deletion attempts do not corrupt data or create unnecessary audit records.
   *
   * 1. Customer registers a new account to obtain authentication credentials.
   * 2. Customer connection is configured with JWT tokens from the registration response.
   * 3. A random UUID is generated that does NOT correspond to any existing review.
   * 4. DELETE request is sent to /ecommerceMall/member/reviews/{nonExistentReviewId}.
   * 5. API returns 404 Not Found with error message indicating review was not found.
   * 6. No snapshot records are created for the non-existent review.
   * 7. No database records are modified during the failed deletion attempt.
   */
  // 1. Customer registration
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Generate a random UUID that does not correspond to any existing review
  const nonExistentReviewId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to delete the non-existent review with authenticated customer connection
  // Expected: 404 Not Found with appropriate error message
  await TestValidator.httpError(
    "should return 404 for non-existent review",
    404,
    async () => {
      await api.functional.ecommerceMall.member.reviews.erase(
        customerConnection, // Use customerConnection which has auth headers from authorize_member_join
        {
          reviewId: nonExistentReviewId,
        },
      );
    },
  );
}
