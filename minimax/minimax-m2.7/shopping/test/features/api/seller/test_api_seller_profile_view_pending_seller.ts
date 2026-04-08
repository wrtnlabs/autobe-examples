import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_seller_profile_view_pending_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller (creates pending seller with approval_status='pending')
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Register and login as super admin for admin operations
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdminConnection);
  // 3. Admin views pending seller profile
  const pendingSeller = await api.functional.ecommerceMall.admin.sellers.at(
    superAdminConnection,
    {
      sellerId: sellerAuth.id,
    },
  );
  typia.assert(pendingSeller);
  // 4. Validate basic seller information is returned
  TestValidator.equals("seller id matches", pendingSeller.id, sellerAuth.id);
  TestValidator.equals(
    "approval status is pending",
    pendingSeller.approvalStatus,
    "pending",
  );
  TestValidator.predicate(
    "created_at exists",
    pendingSeller.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at exists",
    pendingSeller.updatedAt !== undefined,
  );
  // 5. For pending sellers, profile should be null or profile fields should not be fully populated
  // Per spec: "Return basic seller info only (id, approval_status, created_at) without profile details"
  // The IInvert type has profile: ISummary, but for pending sellers, this may be null or minimal
  TestValidator.predicate(
    "profile is null for pending seller",
    pendingSeller.profile === null || pendingSeller.profile === undefined,
  );
}
