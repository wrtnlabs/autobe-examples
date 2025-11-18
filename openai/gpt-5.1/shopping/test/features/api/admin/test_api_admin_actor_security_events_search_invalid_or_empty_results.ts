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

export async function test_api_admin_actor_security_events_search_invalid_or_empty_results(
  connection: api.IConnection,
) {
  // 1. Join an admin (Admin A) to obtain adminId and authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  const adminId: string & tags.Format<"uuid"> = adminAuthorized.id;

  // 2. Optionally create some non-matching security events to prove filtering can yield empty results
  const nonMatchingEventBodies: IShoppingMallActorSecurityEvent.ICreate[] = [
    {
      actor_type: "customer",
      event_type: "LOGIN_FAILED",
      ip: null,
      user_agent: null,
      metadata: null,
    },
    {
      actor_type: "seller",
      event_type: "PASSWORD_RESET_REQUESTED",
      ip: null,
      user_agent: null,
      metadata: null,
    },
  ];

  for (const body of nonMatchingEventBodies) {
    const created =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        { body },
      );
    typia.assert<IShoppingMallActorSecurityEvent>(created);
  }

  // 3. Build a search request with filters that should produce an empty result set
  const requestPage = 1 as number & tags.Type<"int32">;
  const requestLimit = 10 as number & tags.Type<"int32">;

  const requestBody = {
    page: requestPage,
    limit: requestLimit,
    actor_type: "admin", // constrain to admin actor type
    event_type: "NON_EXISTING_EVENT_TYPE",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const pageResult: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.admins.actorSecurityEvents.index(
      connection,
      {
        adminId,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  const pagination: IPage.IPagination = pageResult.pagination;

  // 4. Validate that the result represents an empty page structure
  TestValidator.equals(
    "actor security events search with non-matching filters should return zero records",
    0,
    pagination.records,
  );

  // pages may be 0 or 1 depending on implementation, but must be non-negative
  TestValidator.predicate(
    "actor security events search with zero records should not report negative pages",
    pagination.pages >= 0,
  );

  // current and limit must be non-negative; they may be normalized by the server
  TestValidator.predicate(
    "actor security events search page index must be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "actor security events search page size must be non-negative",
    pagination.limit >= 0,
  );

  // data must be an empty array when there are zero records
  TestValidator.equals(
    "actor security events search with no matches should return empty data array",
    0,
    pageResult.data.length,
  );
}
