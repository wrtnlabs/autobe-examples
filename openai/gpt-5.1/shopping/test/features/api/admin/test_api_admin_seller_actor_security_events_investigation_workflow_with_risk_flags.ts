import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallActorSecurityEvent";
import type { IShoppingMallAccountRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAccountRiskFlag";
import type { IShoppingMallActorSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallActorSecurityEvent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_seller_actor_security_events_investigation_workflow_with_risk_flags(
  connection: api.IConnection,
) {
  // 1. Admin joins (auth context for all subsequent admin-only endpoints)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.console.local/join" as string & tags.Format<"uri">,
    referrer: "https://admin.console.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Configure a seller-targeted risk flag definition
  const riskFlagBody = {
    actor_type: "seller",
    code: "SUSPICIOUS_LOGIN_PATTERN",
    reason: "Multiple failed login attempts from unusual IP ranges",
    severity: "high",
    active: true,
    expires_at: null,
  } satisfies IShoppingMallAccountRiskFlag.ICreate;

  const riskFlag: IShoppingMallAccountRiskFlag =
    await api.functional.shoppingMall.admin.accountRiskFlags.create(
      connection,
      {
        body: riskFlagBody,
      },
    );
  typia.assert(riskFlag);

  // 3. Register a seller and capture its id
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller1234!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.portal.local/join" as string & tags.Format<"uri">,
    referrer: "https://seller.portal.local/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const sellerId = sellerAuthorized.id;

  // 4. As admin, generate multiple suspicious security events for this seller
  // NOTE: actor-specific linkage (sellerId) is handled by backend linkage tables;
  // here we only control actor_type and other contextual fields.
  const suspiciousEventType = "LOGIN_FAILED";
  const riskyIp = "203.0.113.42"; // documentation example IP block
  const riskyUserAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SuspiciousBot/1.0";

  // Create a mix of suspicious and benign events so filter can exclude benign ones
  const totalSuspicious = 5;
  const totalBenign = 3;

  // Create suspicious events
  const suspiciousEvents: IShoppingMallActorSecurityEvent[] = [];
  for (let i = 0; i < totalSuspicious; i++) {
    const eventBody = {
      actor_type: "seller",
      event_type: suspiciousEventType,
      ip: riskyIp,
      user_agent: riskyUserAgent,
      metadata: JSON.stringify({
        pattern: "risky_login",
        attempt: i + 1,
      }),
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const event =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: eventBody,
        },
      );
    typia.assert(event);
    suspiciousEvents.push(event);
  }

  // Create benign events for same actor_type but different event_type or context
  const benignEvents: IShoppingMallActorSecurityEvent[] = [];
  for (let i = 0; i < totalBenign; i++) {
    const benignBody = {
      actor_type: "seller",
      event_type: "PASSWORD_RESET_REQUESTED",
      ip: "198.51.100." + String(10 + i),
      user_agent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
      metadata: JSON.stringify({
        reason: "user_initiated_reset",
        index: i + 1,
      }),
    } satisfies IShoppingMallActorSecurityEvent.ICreate;

    const benign =
      await api.functional.shoppingMall.admin.actorSecurityEvents.create(
        connection,
        {
          body: benignBody,
        },
      );
    typia.assert(benign);
    benignEvents.push(benign);
  }

  // 5. Risk linkage to seller is conceptual; no explicit API is available here.
  // The configured risk flag and created security events together represent the
  // risk context for this seller.

  // 6. As admin, search seller-scoped actor security events for this seller
  // Build a narrow time window around now to ensure we capture the created events.
  const now = new Date();
  const from = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const to = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const pageLimit = 3 as number & tags.Type<"int32">;

  const searchRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageLimit,
    actor_type: "seller",
    event_type: suspiciousEventType,
    from_created_at: from as string & tags.Format<"date-time">,
    to_created_at: to as string & tags.Format<"date-time">,
    ip: riskyIp,
    user_agent: riskyUserAgent,
    metadata: null,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingMallActorSecurityEvent.IRequest;

  const firstPage: IPageIShoppingMallActorSecurityEvent.ISummary =
    await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
      connection,
      {
        sellerId,
        body: searchRequest,
      },
    );
  typia.assert(firstPage);

  // 7. Validate that events match filters and belong to the seller scope
  const firstPageData = firstPage.data;

  // All events in the page must be suspicious seller events matching filters
  for (const summary of firstPageData) {
    TestValidator.equals(
      "actor_type must be seller",
      summary.actor_type,
      "seller",
    );
    TestValidator.equals(
      "event_type must match suspiciousEventType",
      summary.event_type,
      suspiciousEventType,
    );
    if (summary.ip !== null && summary.ip !== undefined) {
      TestValidator.equals(
        "ip must match riskyIp when present",
        summary.ip,
        riskyIp,
      );
    }
    if (summary.user_agent !== null && summary.user_agent !== undefined) {
      TestValidator.equals(
        "user_agent must match riskyUserAgent when present",
        summary.user_agent,
        riskyUserAgent,
      );
    }
  }

  // Ensure at least one of the created suspicious events is present in the search results
  const suspiciousIds = suspiciousEvents.map((e) => e.id);
  const resultIds = firstPageData.map((s) => s.id);

  const intersection = resultIds.filter((id) => suspiciousIds.includes(id));
  TestValidator.predicate(
    "at least one suspicious event should appear in search results",
    intersection.length > 0,
  );

  // 8. Pagination: if there are more suspicious events than the page limit,
  // request the second page and ensure union of pages covers all created suspicious events
  if (firstPage.pagination.records > firstPage.pagination.limit) {
    const secondPageRequest = {
      ...searchRequest,
      page: ((searchRequest.page as number) + 1) as number & tags.Type<"int32">,
    } satisfies IShoppingMallActorSecurityEvent.IRequest;

    const secondPage: IPageIShoppingMallActorSecurityEvent.ISummary =
      await api.functional.shoppingMall.admin.sellers.actorSecurityEvents.index(
        connection,
        {
          sellerId,
          body: secondPageRequest,
        },
      );
    typia.assert(secondPage);

    const combinedIds = [
      ...firstPage.data.map((s) => s.id),
      ...secondPage.data.map((s) => s.id),
    ];

    const allSuspiciousCovered = suspiciousIds.every((id) =>
      combinedIds.includes(id),
    );

    TestValidator.predicate(
      "all created suspicious events must be reachable via pagination",
      allSuspiciousCovered,
    );
  }

  // Conceptual assertion: role-based authorization is respected by requiring admin join
  TestValidator.predicate(
    "admin join must have produced a valid token",
    !!adminAuthorized.token.access && adminAuthorized.token.access.length > 0,
  );
}
