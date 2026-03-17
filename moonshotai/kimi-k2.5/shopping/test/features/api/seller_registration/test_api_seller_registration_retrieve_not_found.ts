import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test error handling when attempting to retrieve a non-existent seller registration.
 *
 * This edge case ensures proper 404 Not Found response when the registrationId
 * path parameter references a record that does not exist in the database.
 *
 * 1. Authenticate as super administrator using the join endpoint
 * 2. Call GET endpoint with a valid UUID format that doesn't exist (all zeros)
 * 3. Verify HTTP 404 status code is returned
 */
export async function test_api_seller_registration_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // Test 404 error for non-existent registration
  await TestValidator.httpError(
    "should return 404 for non-existent seller registration",
    404,
    async () => {
      await api.functional.ecommerceMall.superAdmin.seller_registrations.at(
        adminConnection,
        { registrationId: "00000000-0000-0000-0000-000000000000" },
      );
    },
  );
}
