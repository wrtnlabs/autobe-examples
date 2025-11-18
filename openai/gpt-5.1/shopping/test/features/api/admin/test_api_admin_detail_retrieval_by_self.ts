import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

/**
 * Validate that an authenticated admin can retrieve its own detailed admin
 * record and that authentication is required for the endpoint.
 *
 * Business workflow:
 *
 * 1. Join as an admin via POST /auth/admin/join to create Admin A and obtain its
 *    authorization payload (including id, email, status flags, timestamps and
 *    JWT token). The SDK will automatically store the access token into the
 *    connection headers.
 * 2. Using the same authenticated connection, call GET
 *    /shoppingMall/admin/admins/{adminId} with Admin A's id.
 * 3. Verify that the returned IShoppingMallAdmin record matches the core identity
 *    fields of the authorization payload returned by join.
 * 4. Create a second connection object without any headers to simulate an
 *    unauthenticated caller, then attempt to call the detail endpoint and
 *    assert that it throws an error (authorization required).
 */
export async function test_api_admin_detail_retrieval_by_self(
  connection: api.IConnection,
) {
  // 1. Admin join to create Admin A and establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Keep optional ip omitted to let server infer from request metadata
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorized);

  // 2. Self-detail retrieval using authenticated admin context
  const detail: IShoppingMallAdmin =
    await api.functional.shoppingMall.admin.admins.at(connection, {
      adminId: authorized.id,
    });
  typia.assert<IShoppingMallAdmin>(detail);

  // 3. Verify that detail matches authorization payload core identity fields
  TestValidator.equals(
    "admin id in detail matches authorized id",
    detail.id,
    authorized.id,
  );
  TestValidator.equals(
    "admin email in detail matches authorized email",
    detail.email,
    authorized.email,
  );
  TestValidator.equals(
    "admin status in detail matches authorized status",
    detail.status,
    authorized.status,
  );
  TestValidator.equals(
    "admin email_verified in detail matches authorized email_verified",
    detail.email_verified,
    authorized.email_verified,
  );
  TestValidator.equals(
    "admin created_at in detail matches authorized created_at",
    detail.created_at,
    authorized.created_at,
  );
  TestValidator.equals(
    "admin updated_at in detail matches authorized updated_at",
    detail.updated_at,
    authorized.updated_at,
  );
  TestValidator.equals(
    "admin deleted_at in detail matches authorized deleted_at",
    detail.deleted_at,
    authorized.deleted_at,
  );

  // 4. Ensure authentication is required: unauthenticated request must fail
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "unauthenticated admin detail retrieval must fail",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(unauthConnection, {
        adminId: authorized.id,
      });
    },
  );
}
