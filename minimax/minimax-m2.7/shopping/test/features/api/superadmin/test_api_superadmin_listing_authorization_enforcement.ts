import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_listing_authorization_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Test that non-super admin actors are denied access to the super admin listing endpoint
  // 1. Regular administrators receive 403 Forbidden
  // 2. Customers receive 403 Forbidden
  // 3. Sellers receive 403 Forbidden
  // 4. Unauthenticated guests receive 401 Unauthorized
  // 1. Test admin access denial (403)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  await TestValidator.httpError(
    "admin denied access to super admin listing",
    403,
    async () =>
      api.functional.ecommerceMall.superAdmin.super_admins.index(
        adminConnection,
        {
          body: {},
        },
      ),
  );
  // 2. Test customer access denial (403)
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  await TestValidator.httpError(
    "customer denied access to super admin listing",
    403,
    async () =>
      api.functional.ecommerceMall.superAdmin.super_admins.index(
        customerConnection,
        {
          body: {},
        },
      ),
  );
  // 3. Test seller access denial (403)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  await TestValidator.httpError(
    "seller denied access to super admin listing",
    403,
    async () =>
      api.functional.ecommerceMall.superAdmin.super_admins.index(
        sellerConnection,
        {
          body: {},
        },
      ),
  );
  // 4. Test unauthenticated access denial (401)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated guest denied access to super admin listing",
    401,
    async () =>
      api.functional.ecommerceMall.superAdmin.super_admins.index(
        unauthenticatedConnection,
        {
          body: {},
        },
      ),
  );
  // 5. Verify super admin CAN access (positive test case)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  const superAdminList =
    await api.functional.ecommerceMall.superAdmin.super_admins.index(
      superAdminConnection,
      {
        body: {},
      },
    );
  typia.assert(superAdminList);
  TestValidator.predicate(
    "super admin can access listing",
    superAdminList.data !== undefined,
  );
}
