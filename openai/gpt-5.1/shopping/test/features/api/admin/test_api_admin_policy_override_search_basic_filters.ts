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

export async function test_api_admin_policy_override_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain authorization context.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Seed several policy override records with different combinations.
  const basePolicyVersionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const subjectTypes = ["seller", "product"] as const;
  const statuses = ["pending", "active", "expired"] as const;
  const overrideCodes = ["refund_window", "commission_rate"] as const;

  // Helper to generate a single override create payload for a given subject_type and status.
  const makeOverrideCreate = (
    subject_type: (typeof subjectTypes)[number],
    status: (typeof statuses)[number],
  ): IShoppingMallPolicyOverride.ICreate => {
    const now = new Date();
    const future = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      shopping_mall_policy_version_id: basePolicyVersionId,
      subject_type,
      subject_id: typia.random<string & tags.Format<"uuid">>(),
      subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      override_code: RandomGenerator.pick(overrideCodes),
      override_value: RandomGenerator.paragraph({ sentences: 1 }),
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      status,
      effective_from: now.toISOString(),
      effective_until: future.toISOString(),
    } satisfies IShoppingMallPolicyOverride.ICreate;
  };

  // Create a predictable set of overrides so that filtering is easy to assert.
  const targetSubjectType = "seller" as const;
  const targetStatus = "active" as const;

  // Overrides that should match our later filters.
  const matchingOverrides: IShoppingMallPolicyOverride[] = [];

  // Create 3 overrides that match (seller + active).
  for (let i = 0; i < 3; i++) {
    const body = makeOverrideCreate(targetSubjectType, targetStatus);
    const created: IShoppingMallPolicyOverride =
      await api.functional.shoppingMall.admin.policyOverrides.create(
        connection,
        {
          body,
        },
      );
    typia.assert(created);
    matchingOverrides.push(created);
  }

  // Create some noise overrides that should not match when filtering.
  for (let i = 0; i < 4; i++) {
    const noiseSubjectType = RandomGenerator.pick(subjectTypes);
    const noiseStatus = RandomGenerator.pick(statuses);

    // Ensure at least some differ from the target filters.
    const subject_type =
      noiseSubjectType === targetSubjectType && noiseStatus === targetStatus
        ? "product"
        : noiseSubjectType;
    const status =
      noiseSubjectType === targetSubjectType && noiseStatus === targetStatus
        ? "pending"
        : noiseStatus;

    const body = makeOverrideCreate(
      subject_type,
      status as (typeof statuses)[number],
    );
    const createdNoise: IShoppingMallPolicyOverride =
      await api.functional.shoppingMall.admin.policyOverrides.create(
        connection,
        {
          body,
        },
      );
    typia.assert(createdNoise);
  }

  // 3. Call adminSearch/policyOverrides with basic filters and pagination.
  const pageBase = 1;
  const limitBase = 2;

  const page = pageBase satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  const limit = limitBase satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;

  const searchRequestBody = {
    page,
    limit,
    status: targetStatus,
    subject_type: targetSubjectType,
  } satisfies IShoppingMallPolicyOverride.IRequest;

  const pageResult: IPageIShoppingMallPolicyOverride.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.policyOverrides.index(
      connection,
      {
        body: searchRequestBody,
      },
    );
  typia.assert(pageResult);

  // 4. Validate pagination fields.
  const pagination: IPage.IPagination = pageResult.pagination;
  typia.assert(pagination);

  TestValidator.equals(
    "pagination current page should equal requested page",
    page,
    pagination.current,
  );
  TestValidator.equals(
    "pagination limit should equal requested limit",
    limit,
    pagination.limit,
  );

  // We know exactly 3 overrides match our filters.
  const expectedTotalMatching = matchingOverrides.length;

  const expectedRecords = expectedTotalMatching satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  TestValidator.equals(
    "pagination.records should equal total matching overrides",
    expectedRecords,
    pagination.records,
  );

  const expectedPagesBase = Math.ceil(expectedTotalMatching / limitBase);
  const expectedPages = expectedPagesBase satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<0>;
  TestValidator.equals(
    "pagination.pages should equal expected page count",
    expectedPages,
    pagination.pages,
  );

  // 5. Ensure that all returned data items satisfy the filters.
  const data = pageResult.data;

  await ArrayUtil.asyncForEach(data, async (item, index) => {
    typia.assert<IShoppingMallPolicyOverride.ISummary>(item);

    TestValidator.equals(
      `item ${index} status should match filter`,
      item.status,
      targetStatus,
    );
    TestValidator.equals(
      `item ${index} subject_type should match filter`,
      item.subject_type,
      targetSubjectType,
    );
  });

  // 6. Cross-check that the items in the first page correspond to one of the matching overrides by ID.
  const matchingIds = matchingOverrides.map((o) => o.id);

  await ArrayUtil.asyncForEach(data, async (item, index) => {
    TestValidator.predicate(
      `returned item ${index} should be one of seeded matching overrides`,
      matchingIds.includes(item.id),
    );
  });
}
