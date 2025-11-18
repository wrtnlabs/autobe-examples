import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPolicyOverride";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallPolicyOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyOverride";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Verify admin subject-scoped search for policy overrides.
 *
 * Business goal
 *
 * - Ensure the admin-facing search endpoint for policy overrides can:
 *
 *   - Filter overrides by a specific subject (subject_type + subject_id)
 *   - Relax the filter to all overrides of a single subject_type regardless of
 *       subject_id
 *   - Exclude overrides of other subject types from the result set
 *
 * Scenario
 *
 * 1. Admin bootstrap
 *
 *    - Register a new admin via POST /auth/admin/join using
 *         IShoppingMallAdminJoin.ICreate.
 *    - The SDK automatically stores the admin token in
 *         connection.headers.Authorization.
 *    - Assert the returned IShoppingMallAdmin.IAuthorized structure.
 * 2. Seed policy overrides
 *
 *    - Define a single policyVersionId UUID (shopping_mall_policy_version_id).
 *    - Define two seller subject IDs: sellerAId and sellerBId.
 *    - Create multiple overrides: a) Two overrides for sellerAId (subject_type =
 *         "seller", subject_id = sellerAId) b) One override for sellerBId
 *         (subject_type = "seller", subject_id = sellerBId) c) One override for
 *         a non-seller subject_type (e.g., "customer") with its own subject_id
 *    - Use api.functional.shoppingMall.admin.policyOverrides.create with body:
 *         IShoppingMallPolicyOverride.ICreate and generate other fields
 *         (override_code, override_value, status, effective window) using
 *         Simple values.
 *    - Collect all created overrides and separate them into sellerAOverrides,
 *         sellerBOverrides, otherTypeOverrides.
 * 3. Search with subject_type + subject_id (sellerA)
 *
 *    - Call api.functional.shoppingMall.admin.adminSearch.policyOverrides.index with
 *         body: { page: 1, limit: 20, subject_type: "seller", subject_id:
 *         sellerAId } (plus any other filters as null/undefined where
 *         appropriate).
 *    - Assert the response type with
 *         typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(page).
 *    - Validate:
 *
 *         - All returned records have subject_type === "seller".
 *         - All returned records have subject_id === sellerAId.
 *         - No record's id matches any override created for sellerBId or other
 *                   subject_type.
 *         - The number of returned records matches the count of sellerAOverrides, and
 *                   pagination.records is greater than or equal to that count
 *                   when using a sufficiently large limit.
 * 4. Search with subject_type only (all sellers)
 *
 *    - Call index again with body: { page: 1, limit: 20, subject_type: "seller",
 *         subject_id: null }
 *    - Assert the response type.
 *    - Validate:
 *
 *         - All returned records have subject_type === "seller".
 *         - At least all sellerAOverrides and sellerBOverrides IDs are included in the
 *                   data set.
 *         - No record belongs to the non-seller subject_type created earlier.
 * 5. Subject display sanity check
 *
 *    - When creating overrides for sellerAId and sellerBId, set distinct
 *         subject_display strings (e.g., "Seller A" vs "Seller B").
 *    - For the first search (subject_id = sellerAId), assert that all results have
 *         subject_display === "Seller A".
 *    - For the second search (subject_type only), assert that at least one result
 *         has "Seller A" and at least one result has "Seller B" in
 *         subject_display.
 */
export async function test_api_admin_policy_override_search_subject_scoping(
  connection: api.IConnection,
) {
  // 1. Admin bootstrap: join and obtain authorized admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.test.local/join",
    referrer: "https://admin.test.local/",
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed policy overrides for two sellers and one non-seller subject type
  const policyVersionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const sellerAId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const sellerBId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const customerId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const sellerADisplay = "Seller A";
  const sellerBDisplay = "Seller B";
  const customerDisplay = "VIP Customer";

  // Helper to build a create body
  const buildOverrideCreate = (
    subjectType: string,
    subjectId: string & tags.Format<"uuid">,
    subjectDisplay: string,
    overrideCode: string,
    overrideValue: string,
  ) =>
    ({
      shopping_mall_policy_version_id: policyVersionId,
      subject_type: subjectType,
      subject_id: subjectId,
      subject_display: subjectDisplay,
      override_code: overrideCode,
      override_value: overrideValue,
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      status: "active",
      effective_from: new Date().toISOString(),
      effective_until: null,
    }) satisfies IShoppingMallPolicyOverride.ICreate;

  // Two overrides for seller A
  const sellerAOverride1: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: buildOverrideCreate(
        "seller",
        sellerAId,
        sellerADisplay,
        "refund_window",
        "30_days",
      ),
    });
  typia.assert<IShoppingMallPolicyOverride>(sellerAOverride1);

  const sellerAOverride2: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: buildOverrideCreate(
        "seller",
        sellerAId,
        sellerADisplay,
        "commission_rate",
        "0.12",
      ),
    });
  typia.assert<IShoppingMallPolicyOverride>(sellerAOverride2);

  // One override for seller B
  const sellerBOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: buildOverrideCreate(
        "seller",
        sellerBId,
        sellerBDisplay,
        "refund_window",
        "14_days",
      ),
    });
  typia.assert<IShoppingMallPolicyOverride>(sellerBOverride);

  // One override for a non-seller subject_type (customer)
  const customerOverride: IShoppingMallPolicyOverride =
    await api.functional.shoppingMall.admin.policyOverrides.create(connection, {
      body: buildOverrideCreate(
        "customer",
        customerId,
        customerDisplay,
        "vip_refund_window",
        "60_days",
      ),
    });
  typia.assert<IShoppingMallPolicyOverride>(customerOverride);

  const sellerAOverrides: IShoppingMallPolicyOverride[] = [
    sellerAOverride1,
    sellerAOverride2,
  ];
  const sellerBOverrides: IShoppingMallPolicyOverride[] = [sellerBOverride];

  // 3. Search by subject_type + subject_id (sellerA)
  const searchSellerARequest = {
    page: 1,
    limit: 20,
    status: null,
    subject_type: "seller",
    subject_id: sellerAId,
    override_code: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const sellerAPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
      connection,
      {
        body: searchSellerARequest,
      },
    );
  typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(sellerAPage);

  const sellerAData = sellerAPage.data;

  // Validate that all records are sellerA overrides
  for (const record of sellerAData) {
    TestValidator.equals(
      "subject_type must be seller when filtering by sellerA",
      record.subject_type,
      "seller",
    );
    TestValidator.equals(
      "subject_id must equal sellerAId when filtering by sellerA",
      record.subject_id,
      sellerAId,
    );
    TestValidator.equals(
      "subject_display must be Seller A when filtering by sellerA",
      record.subject_display,
      sellerADisplay,
    );
  }

  // Ensure that only the sellerA overrides we created are present
  const sellerAIds = new Set(sellerAOverrides.map((o) => o.id));
  const sellerBIds = new Set(sellerBOverrides.map((o) => o.id));
  const otherIds = new Set<string>([customerOverride.id]);

  TestValidator.equals(
    "sellerA search must return same count as created sellerA overrides",
    sellerAData.length,
    sellerAOverrides.length,
  );

  for (const record of sellerAData) {
    TestValidator.predicate(
      "record id must be one of sellerA override ids",
      sellerAIds.has(record.id),
    );
    TestValidator.predicate(
      "record id must not be sellerB override id in sellerA search",
      !sellerBIds.has(record.id),
    );
    TestValidator.predicate(
      "record id must not be other subject_type override id in sellerA search",
      !otherIds.has(record.id),
    );
  }

  TestValidator.predicate(
    "pagination limit must be at least number of returned records for sellerA search",
    sellerAPage.pagination.limit >= sellerAData.length,
  );

  // 4. Search with subject_type only (all sellers)
  const searchAllSellersRequest = {
    page: 1,
    limit: 20,
    status: null,
    subject_type: "seller",
    subject_id: null,
    override_code: null,
    effective_from_from: null,
    effective_from_to: null,
    effective_until_from: null,
    effective_until_to: null,
    created_from: null,
    created_to: null,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const allSellersPage: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
      connection,
      {
        body: searchAllSellersRequest,
      },
    );
  typia.assert<IPageIShoppingMallPolicyOverride.ISummary>(allSellersPage);

  const allSellerData = allSellersPage.data;

  for (const record of allSellerData) {
    TestValidator.equals(
      "subject_type must be seller when filtering all sellers",
      record.subject_type,
      "seller",
    );
    TestValidator.predicate(
      "subject_id must be either sellerAId or sellerBId when filtering all sellers",
      record.subject_id === sellerAId || record.subject_id === sellerBId,
    );
    TestValidator.predicate(
      "no customer override should appear in all seller search",
      record.id !== customerOverride.id,
    );
  }

  // Ensure all sellerA and sellerB overrides appear in the all-sellers search
  const allSellerIds = new Set(allSellerData.map((r) => r.id));

  for (const override of sellerAOverrides) {
    TestValidator.predicate(
      "all-seller search must include sellerA overrides",
      allSellerIds.has(override.id),
    );
  }

  for (const override of sellerBOverrides) {
    TestValidator.predicate(
      "all-seller search must include sellerB overrides",
      allSellerIds.has(override.id),
    );
  }

  // 5. Subject display sanity: all-seller data should include both displays
  const hasSellerADisplay = allSellerData.some(
    (r) => r.subject_display === sellerADisplay,
  );
  const hasSellerBDisplay = allSellerData.some(
    (r) => r.subject_display === sellerBDisplay,
  );

  TestValidator.predicate(
    "all-seller search must contain at least one Seller A display",
    hasSellerADisplay,
  );
  TestValidator.predicate(
    "all-seller search must contain at least one Seller B display",
    hasSellerBDisplay,
  );
}
