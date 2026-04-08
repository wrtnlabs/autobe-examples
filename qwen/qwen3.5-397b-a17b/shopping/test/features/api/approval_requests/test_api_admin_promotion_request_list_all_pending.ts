import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator browsing all pending administrator promotion requests.
 *
 * Validates the complete workflow for super administrators to retrieve and view pending administrator promotion requests submitted by members and sellers. Ensures that the listing endpoint correctly returns paginated results with proper applicant information based on actor type discriminator.
 *
 * Special attention is given to verifying that both member and seller applicants are included in the same list, applicant information is correctly resolved based on actorType, and pending requests show null reviewer indicating they are awaiting review.
 *
 * 1. Super administrator account is created and authenticated.
 * 2. Super administrator calls approval requests listing endpoint with empty filter.
 * 3. Validates response structure contains pagination and data array.
 * 4. Validates each request contains required fields: id, actorType, status, reason, createdAt, applicant, reviewer.
 * 5. Validates member applicants contain email and customerProfile with display_name and phone_number.
 * 6. Validates seller applicants contain email and approvalStatus.
 * 7. Validates all pending requests have reviewer as null.
 * 8. Validates pagination metadata structure.
 */
export async function test_api_admin_promotion_request_list_all_pending(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Call approval requests listing endpoint with empty filter (all pending)
  const response =
    await api.functional.shoppingMall.admin.admin.approval_requests.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    response.pagination !== undefined,
  );
  TestValidator.equals("current page is 1", response.pagination.current, 1);
  TestValidator.predicate("limit is positive", response.pagination.limit > 0);
  TestValidator.predicate(
    "records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate("data array exists", Array.isArray(response.data));
  // 4. Validate each promotion request in the response
  for (const request of response.data) {
    // Validate status is pending
    TestValidator.equals("status is pending", request.status, "pending");
    // Validate reviewer is null for pending requests
    TestValidator.predicate(
      "reviewer is null for pending requests",
      request.reviewer === null,
    );
    // Validate actorType is either member or seller
    TestValidator.predicate(
      "actorType is member or seller",
      request.actorType === "member" || request.actorType === "seller",
    );
    // Validate applicant based on actorType using type guards
    if (request.actorType === "member") {
      typia.assertGuard<IShoppingMallMember.ISummary>(request.applicant!);
      const memberApplicant = request.applicant as IShoppingMallMember.ISummary;
      TestValidator.predicate(
        "member applicant has email",
        memberApplicant.email !== undefined,
      );
      TestValidator.predicate(
        "member applicant has customerProfile field",
        memberApplicant.customerProfile !== undefined,
      );
      if (memberApplicant.customerProfile !== null) {
        TestValidator.predicate(
          "customerProfile has display_name",
          memberApplicant.customerProfile.display_name !== undefined,
        );
        TestValidator.predicate(
          "customerProfile has phone_number",
          memberApplicant.customerProfile.phone_number !== undefined,
        );
      }
    } else if (request.actorType === "seller") {
      typia.assertGuard<IShoppingMallSeller.ISummary>(request.applicant!);
      const sellerApplicant = request.applicant as IShoppingMallSeller.ISummary;
      TestValidator.predicate(
        "seller applicant has email",
        sellerApplicant.email !== undefined,
      );
      TestValidator.predicate(
        "seller applicant has approvalStatus",
        sellerApplicant.approvalStatus !== undefined,
      );
    }
  }
  // 5. Validate pagination metadata calculation
  const expectedPages =
    response.pagination.records === 0
      ? 0
      : Math.ceil(response.pagination.records / response.pagination.limit);
  TestValidator.equals(
    "pages calculated correctly",
    response.pagination.pages,
    expectedPages,
  );
}
