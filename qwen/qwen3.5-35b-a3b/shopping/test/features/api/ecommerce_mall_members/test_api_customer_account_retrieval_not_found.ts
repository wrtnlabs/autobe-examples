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

/**
 * Test that attempting to retrieve a non-existent customer account returns 404 Not Found.
 *
 * Validates the error handling for invalid customer IDs by first registering a new customer
 * account to establish baseline data, then attempting to retrieve a customer using a UUID
 * that does not exist in the database. The system should query the ecommerce_mall_members
 * table and find no matching record, returning HTTP 404 Not Found with an appropriate error
 * message indicating the customer does not exist.
 *
 * This scenario verifies the API provides clear feedback when requested resources are not found,
 * which is critical for user experience and proper error handling in the e-commerce platform.
 *
 * 1. Register new customer account to establish baseline data in the system.
 * 2. Generate a random UUID that is guaranteed not to exist in the database.
 * 3. Attempt to retrieve customer account using the non-existent UUID.
 * 4. Validate HTTP 404 Not Found response with appropriate error message.
 */
export async function test_api_customer_account_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer account to establish baseline
  const joinConnection: api.IConnection = { host: connection.host };
  const customerData = await authorize_member_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(customerData);
  // 2. Generate a random UUID that does not exist in the database
  const nonExistentId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to retrieve non-existent customer account
  await TestValidator.httpError(
    "should return 404 for non-existent customer",
    [404],
    async () => {
      await api.functional.ecommerceMall.members.at(joinConnection, {
        memberId: nonExistentId,
      });
    },
  );
}
