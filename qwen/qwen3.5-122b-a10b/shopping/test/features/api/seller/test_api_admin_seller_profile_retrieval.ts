import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_seller_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8> & tags.MaxLength<128>>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate random seller ID to query
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve seller profile
  const sellerProfile = await api.functional.ecommerceMall.admin.sellers.at(
    adminConnection,
    { sellerId },
  );
  typia.assert(sellerProfile);
  // 4. Validate required public fields exist
  TestValidator.equals(
    "shop_name is string",
    typeof sellerProfile.shop_name,
    "string",
  );
  TestValidator.predicate(
    "shop_name not empty",
    sellerProfile.shop_name.length > 0,
  );
  // 5. Validate approval_status is valid enum value
  const validApprovalStatuses = ["pending", "approved", "rejected"] as const;
  TestValidator.predicate(
    "approval_status is valid",
    validApprovalStatuses.includes(
      sellerProfile.approval_status as (typeof validApprovalStatuses)[number],
    ),
  );
  // 6. Validate account_status is valid enum value
  const validAccountStatuses = ["active", "suspended", "banned"] as const;
  TestValidator.predicate(
    "account_status is valid",
    validAccountStatuses.includes(
      sellerProfile.account_status as (typeof validAccountStatuses)[number],
    ),
  );
  // 7. Validate timestamp fields are in ISO format
  TestValidator.predicate(
    "created_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sellerProfile.created_at),
  );
  TestValidator.predicate(
    "updated_at is ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(sellerProfile.updated_at),
  );
  // 8. Verify UUID format for seller ID
  TestValidator.predicate(
    "id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      sellerProfile.id,
    ),
  );
  // 9. Validate optional fields are properly typed
  if (
    sellerProfile.shop_description !== null &&
    sellerProfile.shop_description !== undefined
  ) {
    TestValidator.equals(
      "shop_description is string when present",
      typeof sellerProfile.shop_description,
      "string",
    );
  }
  // 10. Verify rejection_reason is null when not applicable
  if (
    sellerProfile.approval_status === "approved" ||
    sellerProfile.approval_status === "pending"
  ) {
    TestValidator.equals(
      "rejection_reason is null for approved/pending",
      sellerProfile.rejection_reason,
      null,
    );
  }
}