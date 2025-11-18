import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";

export async function test_api_guestuser_actor_security_events_search_unauthenticated_access_denied(
  connection: api.IConnection,
) {
  /**
   * Scenario: verify that guest-user actor security event search is not
   * accessible without proper admin authentication.
   *
   * Business goal:
   *
   * - The PATCH /shoppingMall/admin/guestUsers/{guestUserId}/actorSecurityEvents
   *   endpoint is documented as admin-only security telemetry. A guest user (or
   *   an unauthenticated caller) must not be able to query it successfully.
   *
   * What we validate:
   *
   * 1. A call made on a connection that has no authentication header must fail
   *    when trying to search actor security events for a guest user.
   * 2. We only assert that an error is raised and that no successful
   *    IPageIShoppingMallActorSecurityEvent.ISummary response is returned in
   *    the unauthenticated case.
   * 3. As a sanity check, an authenticated admin can call the same endpoint
   *    successfully, proving that the previous failure is due to
   *    authentication, not an inherent endpoint issue.
   */

  // Prepare dummy guest user id and minimal, valid search request body.
  const guestUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const requestBody = {
    page: typia.random<number & tags.Type<"int32">>(),
    limit: typia.random<number & tags.Type<"int32">>(),
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  // Build an unauthenticated connection: clone host/options but do not
  // propagate headers at all. This represents a client with no auth token.
  const unauthenticatedConnection: api.IConnection = {
    host: connection.host,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };

  // 1) Unauthenticated access must be denied.
  await TestValidator.error(
    "guest-user security event search should reject unauthenticated access",
    async () => {
      await api.functional.shoppingMall.admin.guestUsers.actorSecurityEvents.index(
        unauthenticatedConnection,
        {
          guestUserId,
          body: requestBody,
        },
      );
    },
  );

  // 2) Sanity check: with a properly authenticated admin, the same call
  //    should succeed and return a paginated summary.

  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  const successOutput: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.guestUsers.actorSecurityEvents.index(
      connection,
      {
        guestUserId,
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallActorSecurityEvent.ISummary>(successOutput);
}
