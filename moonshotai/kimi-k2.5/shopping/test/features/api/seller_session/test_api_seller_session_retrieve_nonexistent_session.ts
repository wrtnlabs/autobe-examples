import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Verify appropriate error response when attempting to retrieve a non-existent session.
 *
 * Test steps:
 * 1. Authenticate as a seller by calling POST /ecommerceMall/auth/seller/join using authorize_seller_join utility
 * 2. Generate a valid UUID format sessionId that does not exist in the database
 * 3. Call GET /ecommerceMall/seller/sessions/{sessionId} with the non-existent ID
 * 4. Verify the response returns 404 Not Found
 *
 * Business validation points:
 * - Non-existent session IDs return 404 Not Found rather than other error codes
 * - Error responses do not leak information about whether a session ID format is valid vs actually missing
 * - Session lookup properly filters by existence before authorization checks
 * - The authentication state of the requester is validated before the existence check
 */
export async function test_api_seller_session_retrieve_nonexistent_session(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create seller-specific connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Step 2: Generate a non-existent session ID (valid UUID format that doesn't exist)
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve non-existent session and validate 404 error
  await TestValidator.httpError(
    "non-existent session returns 404 Not Found",
    404,
    async () => {
      await api.functional.ecommerceMall.seller.sessions.at(sellerConnection, {
        sessionId: nonExistentSessionId,
      });
    },
  );
}
