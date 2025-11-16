import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallInventoryItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryItem";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductOptionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionType";
import type { IShoppingMallProductOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductOptionValue";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPerformanceSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPerformanceSummary";

export async function test_api_seller_performance_summary_detail_after_period_of_activity(
  connection: api.IConnection,
) {
  // 1. Arrange: register a platform admin and authenticate
  const platformAdminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.shoppingmall.example.com/join",
    referrer: "https://admin.shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorized);

  // Sanity check: joined admin should have token and id
  TestValidator.predicate(
    "platform admin has non-empty id",
    platformAdminAuthorized.id.length > 0,
  );
  TestValidator.predicate(
    "platform admin access token is non-empty",
    platformAdminAuthorized.token.access.length > 0,
  );

  // 2. Act: call seller performance summary detail as authenticated platform admin
  const sellerPerformanceSummaryId = typia.random<
    string & tags.Format<"uuid">
  >();

  const summary: IShoppingMallSellerPerformanceSummary =
    await api.functional.shoppingMall.platformAdmin.sellerPerformanceSummaries.at(
      connection,
      {
        sellerPerformanceSummaryId,
      },
    );

  // 3. Assert: structural validation
  typia.assert<IShoppingMallSellerPerformanceSummary>(summary);

  // Validate the embedded seller summary structure
  TestValidator.predicate(
    "seller summary id is a non-empty uuid string",
    summary.seller.id.length > 0,
  );
  TestValidator.predicate(
    "seller summary email is a non-empty string",
    summary.seller.email.length > 0,
  );
  TestValidator.predicate(
    "seller summary store_name is a non-empty string",
    summary.seller.store_name.length > 0,
  );

  // Validate period window looks reasonable: period_start <= period_end
  const periodStart = new Date(summary.period_start).getTime();
  const periodEnd = new Date(summary.period_end).getTime();
  TestValidator.predicate(
    "period_start is not after period_end",
    !Number.isNaN(periodStart) &&
      !Number.isNaN(periodEnd) &&
      periodStart <= periodEnd,
  );

  // Validate non-negative counts for core metrics
  TestValidator.predicate(
    "orders_count is non-negative",
    summary.orders_count >= 0,
  );
  TestValidator.predicate(
    "cancelled_orders_count is non-negative",
    summary.cancelled_orders_count >= 0,
  );
  TestValidator.predicate(
    "refunded_orders_count is non-negative",
    summary.refunded_orders_count >= 0,
  );
  TestValidator.predicate(
    "dispute_opened_count is non-negative",
    summary.dispute_opened_count >= 0,
  );
  TestValidator.predicate(
    "dispute_resolved_against_seller_count is non-negative",
    summary.dispute_resolved_against_seller_count >= 0,
  );
  TestValidator.predicate(
    "low_rating_review_count is non-negative",
    summary.low_rating_review_count >= 0,
  );

  // risk_level should be a non-empty string to be meaningful
  TestValidator.predicate(
    "risk_level is a non-empty string",
    summary.risk_level.length > 0,
  );

  // created_at should be a valid date-time string
  const createdAt = new Date(summary.created_at).getTime();
  TestValidator.predicate(
    "created_at is a valid date-time",
    !Number.isNaN(createdAt),
  );
}
