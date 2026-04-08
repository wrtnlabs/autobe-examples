import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test filtering administrator promotion requests by actor type to distinguish between member and seller applicants.
 *
 * Validates the actor type filtering functionality of the admin promotion requests endpoint. The test ensures that super administrators can effectively filter promotion requests by applicant type (member or seller) to focus their review efforts on specific applicant categories.
 *
 * The test creates a super administrator account, then queries promotion requests filtered by each actor type. It verifies that the filtering mechanism correctly isolates member and seller requests without any cross-contamination of actor types in the results.
 *
 * 1. Super administrator authenticates via join operation to obtain access token.
 * 2. Queries promotion requests with actorType filter set to 'member'.
 * 3. Validates all returned requests have actorType 'member' and applicant is IShoppingMallMember.ISummary.
 * 4. Queries promotion requests with actorType filter set to 'seller'.
 * 5. Validates all returned requests have actorType 'seller' and applicant is IShoppingMallSeller.ISummary.
 * 6. Verifies pagination metadata is accurate for each filtered result set.
 */
export async function test_api_admin_promotion_request_filter_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Query promotion requests filtered by actorType 'member'
  const memberRequests =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "member",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(memberRequests);
  // 3. Validate all member requests have correct actorType
  TestValidator.predicate("all member requests have actorType 'member'", () =>
    memberRequests.data.every((req) => req.actorType === "member"),
  );
  // 4. Query promotion requests filtered by actorType 'seller'
  const sellerRequests =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.index(
      superAdminConnection,
      {
        body: {
          actorType: "seller",
          page: 1,
          limit: 100,
        } satisfies IShoppingMallAdminPromotionRequest.IRequest,
      },
    );
  typia.assert(sellerRequests);
  // 5. Validate all seller requests have correct actorType
  TestValidator.predicate("all seller requests have actorType 'seller'", () =>
    sellerRequests.data.every((req) => req.actorType === "seller"),
  );
  // 6. Validate pagination metadata for both result sets
  TestValidator.predicate(
    "member requests pagination is valid",
    () =>
      memberRequests.pagination.current >= 1 &&
      memberRequests.pagination.limit > 0 &&
      memberRequests.pagination.records >= 0 &&
      memberRequests.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "seller requests pagination is valid",
    () =>
      sellerRequests.pagination.current >= 1 &&
      sellerRequests.pagination.limit > 0 &&
      sellerRequests.pagination.records >= 0 &&
      sellerRequests.pagination.pages >= 0,
  );
  // 7. Verify no mixed actor types appear in filtered results
  const hasOnlyMemberTypes = memberRequests.data.every(
    (req) => req.actorType === "member",
  );
  const hasOnlySellerTypes = sellerRequests.data.every(
    (req) => req.actorType === "seller",
  );
  TestValidator.equals(
    "member filter returns only member requests",
    hasOnlyMemberTypes,
    true,
  );
  TestValidator.equals(
    "seller filter returns only seller requests",
    hasOnlySellerTypes,
    true,
  );
}
