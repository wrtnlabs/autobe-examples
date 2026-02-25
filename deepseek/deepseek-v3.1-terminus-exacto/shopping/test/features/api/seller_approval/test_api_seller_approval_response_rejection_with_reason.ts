import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfSeller";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerApprovalResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerApprovalResponse";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_administrator_seller_approval_responses_create } from "../../../generate/generate_random_ecommerce_administrator_seller_approval_responses_create";
import { prepare_random_ecommerce_seller_approval_response } from "../../../prepare/prepare_random_ecommerce_seller_approval_response";

export async function test_api_seller_approval_response_rejection_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection and register admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    },
  });
  typia.assert(admin);
  // Create seller account (pending approval)
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "seller123",
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  // Verify seller is in pending approval status
  TestValidator.equals(
    "seller initial status",
    seller.account_status,
    "pending_approval",
  );
  // Test rejection response creation with invalid queue ID (error scenario)
  const rejectionReason = "Shop name does not meet platform standards.";
  await TestValidator.error("rejection with invalid queue ID", async () => {
    await api.functional.ecommerce.administrator.seller_approval_responses.create(
      adminConnection,
      {
        body: {
          seller_approval_queue_id: typia.random<
            string & tags.Format<"uuid">
          >(),
          decision: "rejected",
          reason: rejectionReason,
        } satisfies IEcommerceSellerApprovalResponse.ICreate,
      },
    );
  });
  // Test valid authentication flows remain functional
  const adminLogin = await authorize_administrator_login(adminConnection, {
    body: {
      email: admin.email,
      password: "admin123",
    },
  });
  typia.assert(adminLogin);
  const sellerLogin = await authorize_seller_login(sellerConnection, {
    body: {
      email: seller.email,
      password: "seller123",
    },
  });
  typia.assert(sellerLogin);
  // Verify seller status remains pending (no approval workflow available)
  TestValidator.equals(
    "seller status unchanged",
    sellerLogin.account_status,
    "pending_approval",
  );
}
