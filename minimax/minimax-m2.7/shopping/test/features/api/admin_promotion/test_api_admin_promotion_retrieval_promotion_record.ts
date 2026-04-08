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

export async function test_api_admin_promotion_retrieval_promotion_record(
  connection: api.IConnection,
): Promise<void> {
  // Generate passwords for test accounts
  const customerPassword = RandomGenerator.alphaNumeric(16) as string &
    tags.Format<"password">;
  // 1. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16) as string &
        tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(superAdmin);
  // 2. Register a customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 3. Submit admin request from customer account
  const adminRequestConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: customer.token.access },
  };
  const adminRequest =
    await api.functional.ecommerceMall.auth.admin.request.join(
      adminRequestConnection,
      {
        body: {
          actorType: "customer",
          requestedGrade: "admin",
          reason: RandomGenerator.paragraph({ sentences: 2 }),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallAdmin.IJoin,
      },
    );
  typia.assert(adminRequest);
  // 4. Approve the admin request to create regular admin account
  const approveConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: superAdmin.token.access },
  };
  const approvedRequest =
    await api.functional.ecommerceMall.superAdmin.admin.requests.approve(
      approveConnection,
      {
        requestId: adminRequest.id,
      },
    );
  typia.assert(approvedRequest);
  // 5. Login as the newly created admin using customer credentials
  const newAdminLoginConnection: api.IConnection = { host: connection.host };
  const newAdmin = await authorize_admin_login(newAdminLoginConnection, {
    body: {
      email: adminRequest.email,
      password: customerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(newAdmin);
  // 6. Promote the newly created regular administrator to super administrator
  const promotionReason = RandomGenerator.paragraph({ sentences: 1 });
  const promotion =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.promote(
      approveConnection,
      {
        adminId: newAdmin.id,
        body: {
          reason: promotionReason,
        } satisfies IEcommerceMallAdminPromotion.ICreate,
      },
    );
  typia.assert(promotion);
  // 7. Extract the promotion record ID from the promotion response
  const promotionId = promotion.id;
  // 8. Call GET /ecommerceMall/superAdmin/superAdmin/admin-promotions/{promotionId}
  const retrievedPromotion =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.at(
      approveConnection,
      {
        promotionId: promotionId,
      },
    );
  typia.assert(retrievedPromotion);
  // Validate retrieved promotion record
  TestValidator.equals(
    "promotion ID matches",
    retrievedPromotion.id,
    promotionId,
  );
  TestValidator.equals(
    "action is promotion",
    retrievedPromotion.action,
    "promotion",
  );
  TestValidator.equals(
    "admin ID matches",
    retrievedPromotion.admin.id,
    newAdmin.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedPromotion.admin.email,
    newAdmin.email,
  );
  TestValidator.equals(
    "performed by super admin matches",
    retrievedPromotion.performedBySuperAdmin.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "reason matches",
    retrievedPromotion.reason,
    promotionReason,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedPromotion.created_at),
  );
}
