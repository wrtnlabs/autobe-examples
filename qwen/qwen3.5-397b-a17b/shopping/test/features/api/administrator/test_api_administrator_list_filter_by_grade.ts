import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdmin";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test administrator list filtering by grade level.
 *
 * Validates that super administrators can correctly filter the administrator list by grade level (regular vs super). The test creates both a super administrator and a regular administrator (through promotion request workflow), then verifies that the grade filter parameter correctly returns only administrators matching the specified grade.
 *
 * The test scenario includes:
 *
 * 1. Super administrator registration and authentication.
 * 2. Member registration and promotion request submission.
 * 3. Super administrator approves promotion request to create regular admin.
 * 4. Filter by grade='regular' returns only regular administrators.
 * 5. Filter by grade='super' returns only super administrators.
 * 6. No filter returns all administrators.
 *
 * Special attention is given to verifying that pagination metadata (records count) updates correctly based on the filtered results, ensuring the filter affects both the data returned and the pagination statistics.
 */
export async function test_api_administrator_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 3. Member submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  // 4. Super admin approves promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals("request approved", approvedRequest.status, "approved");
  // 5. Test filter by grade='regular'
  const regularFilterResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(regularFilterResult);
  TestValidator.predicate(
    "regular filter returns at least one admin",
    regularFilterResult.data.length >= 1,
  );
  for (const admin of regularFilterResult.data) {
    TestValidator.equals(
      `admin ${admin.id} grade is regular`,
      admin.grade,
      "regular",
    );
  }
  TestValidator.equals(
    "regular filter records count matches data length",
    regularFilterResult.pagination.records,
    regularFilterResult.data.length,
  );
  // 6. Test filter by grade='super'
  const superFilterResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "super",
        } satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(superFilterResult);
  TestValidator.predicate(
    "super filter returns at least one admin",
    superFilterResult.data.length >= 1,
  );
  for (const admin of superFilterResult.data) {
    TestValidator.equals(
      `admin ${admin.id} grade is super`,
      admin.grade,
      "super",
    );
  }
  TestValidator.equals(
    "super filter records count matches data length",
    superFilterResult.pagination.records,
    superFilterResult.data.length,
  );
  // 7. Test without grade filter (all admins)
  const allAdminsResult =
    await api.functional.shoppingMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {} satisfies IShoppingMallAdmin.IRequest,
      },
    );
  typia.assert(allAdminsResult);
  TestValidator.predicate(
    "no filter returns all admins",
    allAdminsResult.data.length >= 2,
  );
  const hasRegular = allAdminsResult.data.some(
    (admin) => admin.grade === "regular",
  );
  const hasSuper = allAdminsResult.data.some(
    (admin) => admin.grade === "super",
  );
  TestValidator.predicate("no filter includes regular admins", hasRegular);
  TestValidator.predicate("no filter includes super admins", hasSuper);
  TestValidator.equals(
    "no filter records count matches data length",
    allAdminsResult.pagination.records,
    allAdminsResult.data.length,
  );
  // 8. Verify filtered counts add up
  TestValidator.equals(
    "filtered counts sum equals total",
    regularFilterResult.pagination.records +
      superFilterResult.pagination.records,
    allAdminsResult.pagination.records,
  );
}
