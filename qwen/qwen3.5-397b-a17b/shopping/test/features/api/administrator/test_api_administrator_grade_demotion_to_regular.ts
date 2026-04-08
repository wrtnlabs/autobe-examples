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
 * Test super administrator demoting another super administrator to regular grade.
 *
 * Validates the complete demotion workflow where a super administrator reduces another super administrator's grade to regular, triggering soft deletion of the administrator profile while preserving the base member account.
 *
 * The test covers the full promotion-to-demotion lifecycle: member registration, admin promotion request submission and approval, promotion to super admin, and finally demotion back to regular admin. This ensures the grade management system correctly handles both promotion and demotion operations with proper soft delete behavior.
 *
 * 1. Super administrator A registers and authenticates.
 * 2. Member B registers and submits admin promotion request.
 * 3. Super admin A approves B's request, creating regular admin B.
 * 4. Regular admin B authenticates.
 * 5. Super admin A promotes B to super admin grade.
 * 6. Super admin A demotes B back to regular grade via PUT endpoint.
 * 7. Validates demotion response shows grade='regular' and deletedAt is set.
 * 8. Verifies base member account remains intact and accessible.
 */
export async function test_api_administrator_grade_demotion_to_regular(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator A setup
  const superAdminAConnection: api.IConnection = { host: connection.host };
  const superAdminA = await authorize_super_admin_join(superAdminAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdminA);
  // 2. Member B registration (will become admin B)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = RandomGenerator.alphaNumeric(16);
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberB);
  // 3. Member B submits admin promotion request
  const promotionRequest =
    await generate_random_shopping_mall_member_admin_promotion_requests_create(
      memberBConnection,
      {
        body: {
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(promotionRequest);
  TestValidator.equals(
    "promotion request status is pending",
    promotionRequest.status,
    "pending",
  );
  // 4. Super Admin A approves B's promotion request
  const approvedRequest =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.update(
      superAdminAConnection,
      {
        requestId: promotionRequest.id,
        body: {
          status: "approved",
        } satisfies IShoppingMallAdminPromotionRequest.IUpdate,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "promotion request approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Regular Admin B joins after approval
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB = await authorize_admin_join(adminBConnection, {
    body: {
      email: memberBEmail,
      password: memberBPassword,
      grade: "regular",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminB);
  TestValidator.equals("admin B grade is regular", adminB.grade, "regular");
  // 6. Super Admin A promotes B to super admin
  const promotedAdmin =
    await api.functional.shoppingMall.superAdmin.administrators.update(
      superAdminAConnection,
      {
        administratorId: adminB.id,
        body: {
          grade: "super",
        } satisfies IShoppingMallAdministrator.IUpdate,
      },
    );
  typia.assert(promotedAdmin);
  TestValidator.equals(
    "admin B promoted to super",
    promotedAdmin.grade,
    "super",
  );
  TestValidator.equals(
    "admin B not soft deleted after promotion",
    promotedAdmin.deletedAt,
    null,
  );
  // 7. Super Admin A demotes B back to regular grade
  const demotedAdmin =
    await api.functional.shoppingMall.superAdmin.administrators.update(
      superAdminAConnection,
      {
        administratorId: adminB.id,
        body: {
          grade: "regular",
        } satisfies IShoppingMallAdministrator.IUpdate,
      },
    );
  typia.assert(demotedAdmin);
  // 8. Validate demotion results
  TestValidator.equals(
    "admin B demoted to regular",
    demotedAdmin.grade,
    "regular",
  );
  TestValidator.predicate(
    "admin B soft deleted after demotion",
    demotedAdmin.deletedAt !== null,
  );
  TestValidator.notEquals(
    "updated_at refreshed after demotion",
    demotedAdmin.updatedAt,
    promotedAdmin.updatedAt,
  );
  TestValidator.equals(
    "base member account preserved",
    demotedAdmin.member.id,
    memberB.id,
  );
  TestValidator.equals(
    "member email preserved",
    demotedAdmin.member.email,
    memberBEmail,
  );
}
