import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";

/**
 * Validate seller-scoped security events around email verification lifecycle.
 *
 * Business workflow:
 *
 * 1. Create a new seller via /auth/seller/join and obtain an authenticated seller
 *    context.
 * 2. As that seller, issue an email verification token via
 *    /auth/seller/email/verification/issue.
 * 3. Complete email verification via /auth/seller/email/verification/complete
 *    using a simulated token string.
 * 4. Query seller security events via PATCH
 *    /shoppingMall/seller/sellers/{sellerId}/securityEvents using filters
 *    scoped to the seller and a tight created_from/created_to window.
 * 5. Assert that returned events are structurally valid, scoped to actor_type
 *    "seller" (when present), and that pagination metadata is consistent with
 *    the data array.
 */
export async function test_api_seller_security_events_after_email_verification_flow(
  connection: api.IConnection,
) {
  // 1. Register a new seller and obtain authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const authorizedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedSeller);

  const sellerId = authorizedSeller.id;

  // 2. Issue an email verification token for the seller
  const issueBody = {
    email: authorizedSeller.email,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const issueResponse: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: issueBody,
      },
    );
  typia.assert(issueResponse);

  TestValidator.predicate(
    "email verification issuance should report success",
    issueResponse.success === true,
  );

  // 3. Complete email verification with a simulated opaque token
  const completeBody = {
    token: RandomGenerator.alphaNumeric(48),
  } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest;

  const completeResponse: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      {
        body: completeBody,
      },
    );
  typia.assert(completeResponse);

  TestValidator.predicate(
    "email verification completion should report success",
    completeResponse.success === true,
  );

  // 4. Query seller security events using a bounded time window
  const now = new Date();
  const past = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
  const future = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now

  const requestFilters = {
    page: 1,
    limit: 20,
    actor_type: "seller",
    created_from: past.toISOString(),
    created_to: future.toISOString(),
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const page: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.seller.sellers.securityEvents.index(
      connection,
      {
        sellerId,
        body: requestFilters,
      },
    );
  typia.assert(page);

  const pagination = page.pagination;
  const events = page.data;

  // 5. Basic structural and pagination validations
  TestValidator.predicate(
    "pagination.current must be >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit must be >= 0",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.pages must be >= 0",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination.records must be >= 0",
    pagination.records >= 0,
  );

  if (pagination.records === 0) {
    TestValidator.equals(
      "when records is 0, data array must be empty",
      events.length,
      0,
    );
    return;
  }

  TestValidator.predicate(
    "when records > 0, data array must be non-empty",
    events.length > 0,
  );

  TestValidator.predicate(
    "records should be at least the number of items in this page",
    pagination.records >= events.length,
  );

  // 6. Validate that all returned events are seller-scoped when actor_type is present
  for (const ev of events) {
    if (ev.actor_type !== undefined) {
      TestValidator.equals(
        "security event actor_type should be 'seller' when present",
        ev.actor_type,
        "seller",
      );
    }

    // occurredAt should fall within our queried window
    const occurredAtDate = new Date(ev.occurredAt);
    TestValidator.predicate(
      "security event occurredAt should be within requested time window",
      occurredAtDate.getTime() >= past.getTime() &&
        occurredAtDate.getTime() <= future.getTime(),
    );
  }
}
