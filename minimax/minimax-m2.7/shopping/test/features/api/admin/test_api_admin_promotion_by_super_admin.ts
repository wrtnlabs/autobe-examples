import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotion";
import type { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_super_admin_admins_promote } from "../../../generate/generate_random_ecommerce_mall_super_admin_super_admin_admins_promote";
import { prepare_random_ecommerce_mall_admin_promotion } from "../../../prepare/prepare_random_ecommerce_mall_admin_promotion";

export async function test_api_admin_promotion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Generate test data
  const testPassword = RandomGenerator.alphaNumeric(16);
  const promotionReason = "Exceptional performance and leadership demonstrated";
  // 1. Create super admin connection for promotion action
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: testPassword satisfies string & tags.Format<"password">,
        href: "https://example.com/super-admin/register",
        referrer: "https://example.com/",
      },
    },
  );
  // 2. Create customer connection for submitting admin request
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: testPassword satisfies string & tags.Format<"password">,
      href: "https://example.com/customer/register",
      referrer: "https://example.com/",
    },
  });
  // 3. Submit admin request from customer account
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      customerConnection,
      {
        body: {
          actorType: "customer",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 3 }),
          href: "https://example.com/admin-request",
          referrer: "https://example.com/",
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequest);
  // 4. Approve admin request as super admin to create regular admin
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
      superAdminConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  TestValidator.equals(
    "request status is approved",
    approvedRequest.status,
    "approved",
  );
  // 5. Login as the newly approved regular admin using customer credentials
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdminAuth = await authorize_admin_login(regularAdminConnection, {
    body: {
      email: customerAuth.email,
      password: testPassword,
      href: "https://example.com/admin-login",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 6. Promote the regular admin to super admin
  const promotion =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.promote(
      superAdminConnection,
      {
        adminId: regularAdminAuth.id,
        body: {
          reason: promotionReason,
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  typia.assert(promotion);
  // 7. Validate promotion record
  TestValidator.equals("action is promotion", promotion.action, "promotion");
  TestValidator.equals(
    "admin is_super_admin is true",
    promotion.admin.is_super_admin,
    true,
  );
  TestValidator.equals(
    "admin email matches",
    promotion.admin.email,
    regularAdminAuth.email,
  );
  TestValidator.equals(
    "admin name matches",
    promotion.admin.name,
    regularAdminAuth.name,
  );
  TestValidator.equals(
    "reason matches provided",
    promotion.reason,
    promotionReason,
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(promotion.created_at),
  );
  TestValidator.predicate(
    "performedBySuperAdmin exists",
    promotion.performedBySuperAdmin !== undefined,
  );
  TestValidator.equals(
    "performedBySuperAdmin id matches promoter",
    promotion.performedBySuperAdmin.id,
    superAdminAuth.id,
  );
  TestValidator.equals(
    "performedBySuperAdmin email matches",
    promotion.performedBySuperAdmin.email,
    superAdminAuth.email,
  );
}
