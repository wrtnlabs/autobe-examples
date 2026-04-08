import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test administrator viewing non-existent admin account returns 404 Not Found.
 *
 * Validates that when an authenticated administrator attempts to retrieve details for a non-existent administrator account by providing an invalid admin ID, the system returns a 404 Not Found response. This ensures proper error handling when administrators query for admin accounts that have never been created in the system.
 *
 * The test follows this workflow:
 * 1. Authenticate as administrator using authorize_admin_join
 * 2. Generate a random UUID that does not correspond to any existing admin
 * 3. Attempt to retrieve admin details using api.functional.ecommerce.admin.admins.at with the non-existent adminId
 * 4. Validate that the operation throws HttpError with 404 status code
 *
 * This validates the system's ability to properly handle queries for non-existent resources and return appropriate HTTP error responses.
 */
export async function test_api_admin_view_nonexistent_admin_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      reason: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceAdmin.IJoin,
  });
  // 2. Generate a random UUID that does not exist in the database
  const nonexistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve non-existent admin - should throw 404 HttpError
  await TestValidator.httpError(
    "non-existent admin returns 404",
    404,
    async () => {
      await api.functional.ecommerce.admin.admins.at(adminConnection, {
        adminId: nonexistentAdminId,
      });
    },
  );
}
