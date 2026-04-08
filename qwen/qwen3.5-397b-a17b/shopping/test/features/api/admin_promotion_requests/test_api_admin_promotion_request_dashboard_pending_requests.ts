import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import type { IShoppingMallAdminPromotionRequestDashboard } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequestDashboard";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_shopping_mall_member_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_member_admin_promotion_requests_create";
import { generate_random_shopping_mall_seller_admin_promotion_requests_create } from "../../../generate/generate_random_shopping_mall_seller_admin_promotion_requests_create";
import { prepare_random_shopping_mall_admin_promotion_request } from "../../../prepare/prepare_random_shopping_mall_admin_promotion_request";

/**
 * Test the administrator promotion request dashboard correctly counts multiple pending requests awaiting super administrator review.
 *
 * Validates the complete workflow of creating multiple promotion requests from different user types (members and sellers) and verifies that the super administrator dashboard accurately aggregates and displays the counts. This test ensures the dashboard provides an accurate overview of pending review workload.
 *
 * The test creates eight total promotion requests: five from member accounts and three from seller accounts. All requests are submitted without review, so they remain in pending status. The dashboard should reflect these counts accurately.
 *
 * 1. Super administrator registers and authenticates via join operation.
 * 2. Five member accounts are created and each submits a promotion request.
 * 3. Three seller accounts are created and each submits a promotion request.
 * 4. Super administrator accesses the dashboard endpoint.
 * 5. Validates total count equals 8 (5 member + 3 seller requests).
 * 6. Validates pending count equals 8 (all requests awaiting review).
 * 7. Validates approved and rejected counts equal 0.
 */
export async function test_api_admin_promotion_request_dashboard_pending_requests(
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
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create five member accounts and submit promotion requests
  const memberConnections: api.IConnection[] = [];
  for (let i = 0; i < 5; i++) {
    const memberConnection: api.IConnection = { host: connection.host };
    const member = await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
    typia.assert(member);
    memberConnections.push(memberConnection);
  }
  // Submit promotion requests from all five members
  for (const memberConnection of memberConnections) {
    const memberRequest =
      await generate_random_shopping_mall_member_admin_promotion_requests_create(
        memberConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(memberRequest);
  }
  // 3. Create three seller accounts and submit promotion requests
  const sellerConnections: api.IConnection[] = [];
  for (let i = 0; i < 3; i++) {
    const sellerConnection: api.IConnection = { host: connection.host };
    const seller = await authorize_seller_join(sellerConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallSeller.IJoin,
    });
    typia.assert(seller);
    sellerConnections.push(sellerConnection);
  }
  // Submit promotion requests from all three sellers
  for (const sellerConnection of sellerConnections) {
    const sellerRequest =
      await generate_random_shopping_mall_seller_admin_promotion_requests_create(
        sellerConnection,
        {
          body: {
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          },
        },
      );
    typia.assert(sellerRequest);
  }
  // 4. Access dashboard endpoint as super administrator
  const dashboard =
    await api.functional.shoppingMall.superAdmin.admin_promotion_requests.dashboard(
      superAdminConnection,
    );
  typia.assert(dashboard);
  // 5-7. Validate dashboard counts
  TestValidator.equals("total count", dashboard.total, 8);
  TestValidator.equals("pending count", dashboard.pending, 8);
  TestValidator.equals("approved count", dashboard.approved, 0);
  TestValidator.equals("rejected count", dashboard.rejected, 0);
}
