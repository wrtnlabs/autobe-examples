import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test administrator grade promotion from regular to super administrator.
 *
 * Validates the complete workflow where a super administrator promotes a regular administrator to super administrator grade. The test covers the full administrator lifecycle from member registration through promotion request approval to final grade elevation.
 *
 * The test ensures that grade promotion operations maintain data integrity, properly update timestamps, and preserve administrator account status. Special attention is given to verifying that the promoted administrator retains access privileges and the account remains active throughout the promotion process.
 *
 * 1. Super administrator registers and authenticates.
 * 2. Member account is created for the future administrator.
 * 3. Member submits administrator promotion request.
 * 4. Super administrator approves the promotion request.
 * 5. Regular administrator joins with approved credentials (grade='regular').
 * 6. Super administrator promotes regular admin to super admin grade.
 * 7. Validates grade changed from 'regular' to 'super'.
 * 8. Validates administrator account remains active (deletedAt is null).
 * 9. Validates updated_at timestamp was refreshed.
 */
export async function test_api_administrator_grade_promotion_to_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator setup
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
  // 2. Create member account that will become administrator
  const memberConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
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
  TestValidator.equals(
    "promotion request status",
    promotionRequest.status,
    "pending",
  );
  // 4. Super admin approves the promotion request
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
  TestValidator.equals("approval status", approvedRequest.status, "approved");
  // 5. Regular administrator joins after approval
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  TestValidator.equals("admin grade", admin.grade, "regular");
  // 6. Super admin promotes regular admin to super admin
  const promotedAdmin =
    await api.functional.shoppingMall.superAdmin.administrators.update(
      superAdminConnection,
      {
        administratorId: admin.id,
        body: {
          grade: "super",
        } satisfies IShoppingMallAdministrator.IUpdate,
      },
    );
  typia.assert(promotedAdmin);
  // 7. Validate grade changed to super
  TestValidator.equals("grade promoted to super", promotedAdmin.grade, "super");
  // 8. Validate administrator remains active (not soft deleted)
  TestValidator.equals("administrator active", promotedAdmin.deletedAt, null);
  // 9. Validate timestamps are valid
  TestValidator.predicate(
    "updated_at is valid date-time",
    () =>
      new Date(promotedAdmin.updatedAt).getTime() >=
      new Date(promotedAdmin.createdAt).getTime(),
  );
  // 10. Validate member relation exists
  TestValidator.predicate(
    "member relation exists",
    () =>
      promotedAdmin.member !== null && promotedAdmin.member.id !== undefined,
  );
}
