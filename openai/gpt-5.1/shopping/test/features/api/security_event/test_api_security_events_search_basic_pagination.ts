import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

export async function test_api_security_events_search_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authorized session
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // Optional IP can be omitted; href and referrer must be valid URIs
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Basic sanity check: admin is active and has a token
  TestValidator.predicate(
    "platform admin account is active",
    admin.isActive === true,
  );
  typia.assert<IAuthorizationToken>(admin.token);

  // 2. Call security events search with minimal pagination filters only
  const requestBody = {
    page: 1,
    limit: 20,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const page =
    await api.functional.shoppingMall.platformAdmin.securityEvents.index(
      connection,
      {
        body: requestBody,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(page);

  const pagination = page.pagination;
  const data = page.data;

  // 3. Pagination metadata basic invariants
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );

  // records should be at least the number of items in current page
  TestValidator.predicate(
    "records is greater than or equal to current page size",
    pagination.records >= data.length,
  );

  // pages and records consistency
  if (pagination.records === 0) {
    TestValidator.predicate(
      "no records implies zero pages and empty data",
      pagination.pages === 0 && data.length === 0,
    );
  } else {
    TestValidator.predicate(
      "positive records implies at least one page",
      pagination.pages >= 1,
    );
  }

  // When limit is positive, data length should not exceed it
  if (pagination.limit > 0) {
    TestValidator.predicate(
      "data length does not exceed limit",
      data.length <= pagination.limit,
    );
  }

  // 4. Sanity check first event summary structure beyond typia.assert
  if (data.length > 0) {
    const first: IShoppingMallSecurityEvent.ISummary = data[0];
    typia.assert<IShoppingMallSecurityEvent.ISummary>(first);

    TestValidator.predicate(
      "security event id is non-empty string",
      typeof first.id === "string" && first.id.length > 0,
    );
    TestValidator.predicate(
      "security event occurredAt is non-empty string",
      typeof first.occurredAt === "string" && first.occurredAt.length > 0,
    );
    TestValidator.predicate(
      "security event_type is non-empty string",
      typeof first.event_type === "string" && first.event_type.length > 0,
    );

    if (first.actor_type !== undefined) {
      TestValidator.predicate(
        "actor_type, when present, is non-empty string",
        first.actor_type.length > 0,
      );
    }

    if (first.ip_address !== undefined && first.ip_address !== null) {
      TestValidator.predicate(
        "ip_address, when present, is non-empty string",
        first.ip_address.length > 0,
      );
    }

    if (first.user_agent !== undefined && first.user_agent !== null) {
      TestValidator.predicate(
        "user_agent, when present, is non-empty string",
        first.user_agent.length > 0,
      );
    }
  }

  // 5. No additional side-effecting calls: by design, we only joined and then read security events.
}
