import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuestuser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformGuestuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformGuestuser";

/**
 * Verify that guestUsers search requires admin authentication.
 *
 * This test ensures that the PATCH /communityPlatform/adminUser/guestUsers
 * endpoint is protected and only callable by an authenticated adminUser.
 *
 * Steps:
 *
 * 1. Build a minimal valid guest search request (page=1, limit=10).
 * 2. Clone the incoming connection into an unauthenticated variant with cleared
 *    headers and call the guestUsers search endpoint, expecting an error due to
 *    missing admin authorization.
 * 3. Perform admin join via POST /auth/adminUser/join to create and authenticate
 *    an adminUser, letting the SDK attach the Authorization header to the
 *    original connection.
 * 4. Call guestUsers search again with the authenticated connection and confirm a
 *    successful paginated result is returned.
 */
export async function test_api_guest_users_search_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a minimal valid search request body
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
  } satisfies ICommunityPlatformGuestuser.IRequest;

  // 2. Attempt to call guestUsers search without admin authentication.
  //    We create an unauthenticated clone of the connection by resetting
  //    headers to an empty object. Per rules, we avoid touching headers
  //    afterward.
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "guestUsers search should fail without admin auth",
    async () => {
      await api.functional.communityPlatform.adminUser.guestUsers.index(
        unauthenticatedConnection,
        {
          body: requestBody,
        },
      );
    },
  );

  // 3. Register and authenticate an adminUser using join endpoint.
  const adminJoinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorizedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 4. Call guestUsers search again with authenticated connection and
  //    verify a valid paginated response.
  const pageResult: IPageICommunityPlatformGuestuser.ISummary =
    await api.functional.communityPlatform.adminUser.guestUsers.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // Basic logical validations on pagination structure
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be >= 0",
    pageResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pageResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be >= 0",
    pageResult.pagination.pages >= 0,
  );
}
