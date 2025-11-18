import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCaseSlaViolation";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBusinessPolicy";
import type { IShoppingMallCaseSlaConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaConfig";
import type { IShoppingMallCaseSlaViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCaseSlaViolation";
import type { IShoppingMallPolicyVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPolicyVersion";

/**
 * Validate stable pagination and sorting over SLA violations.
 *
 * Business goal: Ensure that an admin browsing SLA violation summaries using
 * the /shoppingMall/admin/caseSlaViolations search endpoint gets consistently
 * ordered, non-overlapping pages when sorting by detected_at, and that
 * switching sort direction reverses the sequence correctly.
 *
 * High level steps:
 *
 * 1. Register and authenticate an admin via POST /auth/admin/join.
 * 2. Create at least one SLA configuration via POST
 *    /shoppingMall/admin/caseSlaConfigs (environment readiness).
 * 3. Call PATCH /shoppingMall/admin/caseSlaViolations for page=1, pageSize=10,
 *    orderBy=detected_at, orderDirection=desc and verify descending ordering
 *    within page 1.
 * 4. Call the same endpoint for page=2 and verify:
 *
 *    - No overlapping IDs between page1 and page2.
 *    - The concatenated list preserves detected_at descending order.
 * 5. Optionally call page=3 to ensure ordering continues or that the API returns
 *    an empty page gracefully when exhausted.
 * 6. Call the endpoint again with orderDirection=asc and a large pageSize; verify
 *    ascending ordering and that, for the set of records visible in both
 *    directions, the ordering is reversed.
 */
export async function test_api_case_sla_violations_search_pagination_and_sorting_stability(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create at least one SLA configuration so that the environment
  //    has a valid SLA rule. We do not rely on it to generate
  //    violations directly, but it ensures the domain is configured.
  const slaConfigBody = {
    shopping_mall_business_policy_version_id: null,
    case_type: RandomGenerator.paragraph({ sentences: 1 }),
    actor_role: RandomGenerator.paragraph({ sentences: 1 }),
    action_type: RandomGenerator.paragraph({ sentences: 1 }),
    target_duration_seconds: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
    warning_duration_seconds: null,
    is_active: true,
  } satisfies IShoppingMallCaseSlaConfig.ICreate;

  const slaConfig =
    await api.functional.shoppingMall.admin.caseSlaConfigs.create(connection, {
      body: slaConfigBody,
    });
  typia.assert<IShoppingMallCaseSlaConfig>(slaConfig);

  // Helper to check ordering by detected_at
  const assert_sorted_by_detected_at = (
    title: string,
    list: IShoppingMallCaseSlaViolation.ISummary[],
    direction: "asc" | "desc",
  ): void => {
    for (let i = 1; i < list.length; i += 1) {
      const prev = list[i - 1];
      const curr = list[i];
      const prevTime = new Date(prev.detected_at).getTime();
      const currTime = new Date(curr.detected_at).getTime();
      if (direction === "desc") {
        TestValidator.predicate(
          `${title} - desc order at index ${i}`,
          prevTime >= currTime,
        );
      } else {
        TestValidator.predicate(
          `${title} - asc order at index ${i}`,
          prevTime <= currTime,
        );
      }
    }
  };

  // 3. Fetch page 1 descending
  const pageSize = 10 as const;
  const descPage1Body = {
    case_type: null,
    actor_role: null,
    action_type: null,
    shopping_mall_case_sla_config_id: null,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_refund_request_id: null,
    shopping_mall_dispute_id: null,
    breach_duration_seconds_min: null,
    breach_duration_seconds_max: null,
    detected_from: null,
    detected_to: null,
    page: 1 as number & tags.Type<"int32">,
    pageSize: pageSize as number & tags.Type<"int32">,
    orderBy: "detected_at",
    orderDirection: "desc",
  } satisfies IShoppingMallCaseSlaViolation.IRequest;

  const descPage1 =
    await api.functional.shoppingMall.admin.caseSlaViolations.index(
      connection,
      { body: descPage1Body },
    );
  typia.assert<IPageIShoppingMallCaseSlaViolation.ISummary>(descPage1);

  const page1Data = descPage1.data;
  assert_sorted_by_detected_at("page1 desc", page1Data, "desc");

  // 4. Fetch page 2 descending
  const descPage2Body = {
    ...descPage1Body,
    page: 2 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCaseSlaViolation.IRequest;

  const descPage2 =
    await api.functional.shoppingMall.admin.caseSlaViolations.index(
      connection,
      { body: descPage2Body },
    );
  typia.assert<IPageIShoppingMallCaseSlaViolation.ISummary>(descPage2);

  const page2Data = descPage2.data;
  assert_sorted_by_detected_at("page2 desc", page2Data, "desc");

  // If both pages have data, ensure no overlap and global ordering
  if (page1Data.length > 0 && page2Data.length > 0) {
    const page1Ids = new Set(page1Data.map((v) => v.id));
    for (const v of page2Data) {
      TestValidator.predicate(
        "no overlapping ids between page1 and page2",
        page1Ids.has(v.id) === false,
      );
    }

    const combinedDesc = [...page1Data, ...page2Data];
    assert_sorted_by_detected_at(
      "combined page1+page2 desc",
      combinedDesc,
      "desc",
    );
  }

  // 5. Optional page 3
  const descPage3Body = {
    ...descPage1Body,
    page: 3 as number & tags.Type<"int32">,
  } satisfies IShoppingMallCaseSlaViolation.IRequest;

  const descPage3 =
    await api.functional.shoppingMall.admin.caseSlaViolations.index(
      connection,
      { body: descPage3Body },
    );
  typia.assert<IPageIShoppingMallCaseSlaViolation.ISummary>(descPage3);

  const page3Data = descPage3.data;
  assert_sorted_by_detected_at("page3 desc", page3Data, "desc");

  // If all three pages have data, check extended combined ordering
  if (page1Data.length > 0 && page2Data.length > 0 && page3Data.length > 0) {
    const combinedAll = [...page1Data, ...page2Data, ...page3Data];
    assert_sorted_by_detected_at(
      "combined page1+page2+page3 desc",
      combinedAll,
      "desc",
    );
  }

  // 6. Ascending order request
  // Choose an asc pageSize large enough to cover at least what we
  // saw in descending pages. Use 30 as an upper bound.
  const ascPageSize = 30 as const;
  const ascBody = {
    case_type: null,
    actor_role: null,
    action_type: null,
    shopping_mall_case_sla_config_id: null,
    shopping_mall_cancellation_request_id: null,
    shopping_mall_refund_request_id: null,
    shopping_mall_dispute_id: null,
    breach_duration_seconds_min: null,
    breach_duration_seconds_max: null,
    detected_from: null,
    detected_to: null,
    page: 1 as number & tags.Type<"int32">,
    pageSize: ascPageSize as number & tags.Type<"int32">,
    orderBy: "detected_at",
    orderDirection: "asc",
  } satisfies IShoppingMallCaseSlaViolation.IRequest;

  const ascPage =
    await api.functional.shoppingMall.admin.caseSlaViolations.index(
      connection,
      { body: ascBody },
    );
  typia.assert<IPageIShoppingMallCaseSlaViolation.ISummary>(ascPage);

  const ascData = ascPage.data;
  assert_sorted_by_detected_at("asc page1", ascData, "asc");

  // If we have enough data across desc and asc, compare relative
  // ordering on the intersection of IDs.
  const combinedForCompare = [...page1Data, ...page2Data, ...page3Data];
  if (combinedForCompare.length > 1 && ascData.length > 1) {
    const descIds = combinedForCompare.map((v) => v.id);
    const ascIds = ascData.map((v) => v.id);

    const intersection = ascIds.filter((id) => descIds.includes(id));

    if (intersection.length > 1) {
      const descOrderIndex = new Map<string, number>();
      descIds.forEach((id, index) => {
        descOrderIndex.set(id, index);
      });

      const intersectionDescOrdered = [...intersection].sort((a, b) => {
        const ia = descOrderIndex.get(a);
        const ib = descOrderIndex.get(b);
        if (ia === undefined || ib === undefined) return 0;
        return ia - ib;
      });

      const intersectionAscOrdered = [...intersection];

      // For a perfect reverse order, the intersection as seen in
      // ascIds should equal the reverse of the sequence from desc.
      const reversedFromDesc = [...intersectionDescOrdered].reverse();

      TestValidator.equals(
        "ascending order is reverse of descending for intersection subset",
        intersectionAscOrdered,
        reversedFromDesc,
      );
    }
  }
}
