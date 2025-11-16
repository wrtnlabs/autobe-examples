import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleViolation";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleViolation";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify complex filtering and pagination for fraud rule violations.
 *
 * This e2e test focuses on the administrative search endpoint PATCH
 * /shoppingMall/platformAdmin/fraudRuleViolations. It wires up a realistic
 * platformAdmin context, seeds some related configuration, and then exercises
 * the violation index endpoint with progressively narrower filters and
 * pagination.
 *
 * High-level steps:
 *
 * 1. Join as a platform administrator, obtaining an authorized admin session.
 * 2. Create a couple of fraud rule definitions with different ruleCodes and
 *    severity/scope settings (although we cannot directly bind them to
 *    violations in this test).
 * 3. Create a payment method and multiple payment transactions to simulate
 *    activity in the payment domain (again, we do not assume this will
 *    deterministically yield violations; violations may be pre-populated or
 *    generated out of band).
 * 4. Call the fraudRuleViolations.index endpoint with a broad filter to validate
 *    the request/response DTOs and baseline pagination behavior.
 * 5. If any violations exist, pick one as a reference and build a more specific
 *    filter using its rule_definition.rule_code, actor_type, and created_at as
 *    a tight createdFrom/createdTo window.
 * 6. Assert that all results returned under the filtered search satisfy the filter
 *    constraints for rule code, entity type, and creation timestamp.
 * 7. Validate pagination by requesting a second page when there are more records
 *    than the chosen limit, ensuring page indices and record counts behave as
 *    expected and that combined pages do not contain duplicate violation IDs.
 * 8. Optionally, exercise excludeRuleCodes with the chosen rule code and verify
 *    that no returned violations use the excluded rule definition.
 *
 * Because the test harness does not expose direct APIs to create violations or
 * trigger the fraud engine, the test is deliberately defensive: when no
 * violations are present it still validates type correctness and pagination
 * invariants, but it skips assertions that depend on having at least one
 * violation to filter against.
 */
export async function test_api_platform_admin_fraud_violation_index_with_complex_filters(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain an authorized session.
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create two fraud rule definitions with distinct rule codes.
  const ruleHighCreate = {
    ruleCode: `HIGH_RISK_${RandomGenerator.alphabets(6)}`,
    name: "High risk payment rule",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    scope: "payment",
    severity: "high",
    ruleExpression: '{ "type": "threshold", "field": "amount", "gte": 100000 }',
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const ruleLowCreate = {
    ruleCode: `LOW_RISK_${RandomGenerator.alphabets(6)}`,
    name: "Low risk payment rule",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    scope: "payment",
    severity: "low",
    ruleExpression: '{ "type": "threshold", "field": "amount", "gte": 1000 }',
    isEnabled: true,
  } satisfies IShoppingMallFraudRuleDefinition.ICreate;

  const ruleHigh: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: ruleHighCreate },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(ruleHigh);

  const ruleLow: IShoppingMallFraudRuleDefinition =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
      connection,
      { body: ruleLowCreate },
    );
  typia.assert<IShoppingMallFraudRuleDefinition>(ruleLow);

  // 3. Create a payment method configuration.
  const now = new Date();
  const methodCreate = {
    code: `pm_${RandomGenerator.alphabets(6)}`,
    display_name: "Test Card",
    description: RandomGenerator.paragraph({ sentences: 2 }),
    provider_key: "test-gateway",
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_active: true,
    starts_at: now.toISOString(),
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const paymentMethod: IShoppingMallPaymentMethod =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: methodCreate },
    );
  typia.assert<IShoppingMallPaymentMethod>(paymentMethod);

  // 4. Create multiple payment transactions tied to this method.
  const transactionCount = 6;
  const transactions: IShoppingMallPaymentTransaction[] = [];
  const paymentStatuses = [
    "payment_pending",
    "payment_authorized",
    "payment_captured",
  ] as const;

  for (let i = 0; i < transactionCount; i += 1) {
    const createTx = {
      orderId: typia.random<string & tags.Format<"uuid">>(),
      customerId: null,
      paymentMethodId: paymentMethod.id,
      paymentIntentKey: null,
      providerName: "test-gateway",
      providerTransactionId: null,
      currency: "USD" as const,
      authorizedAmount: i % 2 === 0 ? 10000 + i * 100 : null,
      capturedAmount: i % 3 === 0 ? 5000 + i * 50 : null,
      paymentStatus: paymentStatuses[i % paymentStatuses.length],
      providerStatus: null,
      failureReasonCode: null,
      failureReasonMessage: null,
      requiresManualReview: i % 2 === 0,
      metadataJson: null,
    } satisfies IShoppingMallPaymentTransaction.ICreate;

    const tx: IShoppingMallPaymentTransaction =
      await api.functional.shoppingMall.platformAdmin.paymentTransactions.create(
        connection,
        { body: createTx },
      );
    typia.assert<IShoppingMallPaymentTransaction>(tx);
    transactions.push(tx);
  }

  // 5. Broad search over fraud rule violations with small limit.
  const broadRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 2 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: undefined,
    sortOrder: undefined,
    ruleCodes: undefined,
    excludeRuleCodes: undefined,
    entityTypes: undefined,
    entityIds: undefined,
    minSeverity: undefined,
    maxSeverity: undefined,
    status: undefined,
    decisionOutcomes: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    search: undefined,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const broadPage: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
      connection,
      { body: broadRequest },
    );
  typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>(broadPage);

  const pagination = broadPage.pagination;
  const violations = broadPage.data;

  // Basic pagination invariants.
  TestValidator.predicate(
    "pagination.current is zero-based and non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit non-negative",
    pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records >= data length",
    pagination.records >= violations.length,
  );
  if (pagination.records === 0) {
    TestValidator.equals("no pages when no records", pagination.pages, 0);
    return;
  }

  TestValidator.predicate(
    "pages positive when there are records",
    pagination.pages > 0,
  );

  // 6. If we have at least one violation, build a specific filter based on it.
  const reference = violations[0];
  const ruleCode = reference.rule_definition.rule_code;
  const actorType = reference.actor_type;
  const createdAt = reference.created_at;

  const specificRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: undefined,
    sortOrder: undefined,
    ruleCodes: [ruleCode],
    excludeRuleCodes: undefined,
    entityTypes: [actorType],
    entityIds: undefined,
    minSeverity: undefined,
    maxSeverity: undefined,
    status: undefined,
    decisionOutcomes: undefined,
    createdFrom: createdAt,
    createdTo: createdAt,
    updatedFrom: undefined,
    updatedTo: undefined,
    search: undefined,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const specificPage: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
      connection,
      { body: specificRequest },
    );
  typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>(specificPage);

  for (const v of specificPage.data) {
    TestValidator.equals(
      "filtered rule code matches",
      v.rule_definition.rule_code,
      ruleCode,
    );
    TestValidator.equals(
      "filtered actor type matches",
      v.actor_type,
      actorType,
    );
    TestValidator.equals(
      "filtered created_at within window",
      v.created_at,
      createdAt,
    );
  }

  // 7. Validate pagination by requesting a second page when applicable.
  if (pagination.records > pagination.limit) {
    const secondRequest = {
      ...broadRequest,
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    } satisfies IShoppingMallFraudRuleViolation.IRequest;

    const secondPage: IPageIShoppingMallFraudRuleViolation.ISummary =
      await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
        connection,
        { body: secondRequest },
      );
    typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>(secondPage);

    TestValidator.equals(
      "second page current index is 1 (zero-based)",
      secondPage.pagination.current,
      1,
    );

    const combinedIds = [
      ...broadPage.data.map((v) => v.id),
      ...secondPage.data.map((v) => v.id),
    ];

    const uniqueIds = new Set(combinedIds);
    TestValidator.equals(
      "no duplicate violation IDs across first two pages",
      uniqueIds.size,
      combinedIds.length,
    );
  }

  // 8. Optional: use excludeRuleCodes to ensure excluded rule is not present.
  const excludeRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: undefined,
    sortOrder: undefined,
    ruleCodes: undefined,
    excludeRuleCodes: [ruleCode],
    entityTypes: undefined,
    entityIds: undefined,
    minSeverity: undefined,
    maxSeverity: undefined,
    status: undefined,
    decisionOutcomes: undefined,
    createdFrom: undefined,
    createdTo: undefined,
    updatedFrom: undefined,
    updatedTo: undefined,
    search: undefined,
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const excludePage: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
      connection,
      { body: excludeRequest },
    );
  typia.assert<IPageIShoppingMallFraudRuleViolation.ISummary>(excludePage);

  for (const v of excludePage.data) {
    TestValidator.notEquals(
      "excludeRuleCodes filters out selected rule code",
      v.rule_definition.rule_code,
      ruleCode,
    );
  }
}
