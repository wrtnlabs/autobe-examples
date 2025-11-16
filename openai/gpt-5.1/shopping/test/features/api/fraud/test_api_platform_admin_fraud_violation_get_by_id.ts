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

export async function test_api_platform_admin_fraud_violation_get_by_id(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin so that subsequent calls are authorized.
  const joinRequest = {
    email: `${RandomGenerator.alphabets(8)}@admin.example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(admin);

  // 2. Search fraud rule violations with a simple first-page filter.
  const searchRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "created_at",
    sortOrder: "desc",
  } satisfies IShoppingMallFraudRuleViolation.IRequest;

  const pageResult: IPageIShoppingMallFraudRuleViolation.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(pageResult);

  // Basic sanity checks on pagination metadata.
  TestValidator.predicate(
    "pagination current page should be >= 0",
    pageResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be > 0",
    pageResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be >= 0",
    pageResult.pagination.records >= 0,
  );

  // 3. If there is at least one violation, fetch its detail and compare.
  const firstSummary: IShoppingMallFraudRuleViolation.ISummary | undefined =
    pageResult.data[0];

  if (!firstSummary) {
    // Environment has no fraud violations yet. Test stops here.
    TestValidator.equals(
      "no violations present implies empty data array",
      pageResult.data.length,
      0,
    );
    return;
  }

  // 4. Fetch detail by ID.
  const detail: IShoppingMallFraudRuleViolation =
    await api.functional.shoppingMall.platformAdmin.fraudRuleViolations.at(
      connection,
      {
        fraudRuleViolationId: firstSummary.id,
      },
    );
  typia.assert(detail);

  // 5. Core identity consistency checks.
  TestValidator.equals(
    "detail id should match summary id",
    detail.id,
    firstSummary.id,
  );

  // Entity linkage: actor vs entity.
  TestValidator.equals(
    "detail entityId should match summary actor_id",
    detail.entityId,
    firstSummary.actor_id,
  );
  TestValidator.equals(
    "detail entityType should match summary actor_type",
    detail.entityType,
    firstSummary.actor_type,
  );

  // Severity should be consistent.
  TestValidator.equals(
    "detail severity should match summary severity",
    detail.severity,
    firstSummary.severity,
  );

  // Rule metadata consistency: summary.rule_definition vs detail.ruleDefinition.
  if (firstSummary.rule_definition && detail.ruleDefinition) {
    TestValidator.equals(
      "rule definition id should match between summary and detail",
      detail.ruleDefinition.id,
      firstSummary.rule_definition.id,
    );
    TestValidator.equals(
      "rule definition rule_code vs detail.ruleCode should align logically",
      detail.ruleCode,
      firstSummary.rule_definition.rule_code,
    );
    TestValidator.equals(
      "rule definition severity should match",
      detail.ruleDefinition.severity,
      firstSummary.rule_definition.severity,
    );
  }

  // Timestamp consistency: occurred_at/created_at vs occurredAt/createdAt.
  TestValidator.equals(
    "detail occurredAt should match summary occurred_at",
    detail.occurredAt,
    firstSummary.occurred_at,
  );
  TestValidator.equals(
    "detail createdAt should match summary created_at",
    detail.createdAt,
    firstSummary.created_at,
  );
}
