import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
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
import { generate_random_ecommerce_mall_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for suspending seller and retrieving suspension
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 2. Create a seller account to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Create a seller suspension record
  const suspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: seller.id,
          reason: "Policy violation - selling prohibited items",
        },
      },
    );
  typia.assert(suspension);
  // 4. Retrieve the suspension details by ID
  const retrieved =
    await api.functional.ecommerceMall.admin.seller_suspensions.at(
      adminConnection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrieved);
  // 5. Validate suspension details
  TestValidator.equals("suspension ID matches", retrieved.id, suspension.id);
  TestValidator.equals(
    "reason is present",
    retrieved.reason,
    "Policy violation - selling prohibited items",
  );
  TestValidator.predicate(
    "suspended_at timestamp is present",
    !!retrieved.suspended_at,
  );
  TestValidator.equals(
    "restored_at is null for active suspension",
    retrieved.restored_at,
    null,
  );
  TestValidator.equals("seller ID matches", retrieved.seller.id, seller.id);
  TestValidator.predicate("seller email is present", !!retrieved.seller.email);
  TestValidator.predicate(
    "seller approval_status is present",
    !!retrieved.seller.approval_status,
  );
  TestValidator.predicate(
    "suspended_by admin is present",
    !!retrieved.suspended_by,
  );
  TestValidator.equals(
    "suspended_by admin ID matches",
    retrieved.suspended_by.id,
    admin.id,
  );
  TestValidator.equals(
    "restored_by is null for active suspension",
    retrieved.restored_by,
    null,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    !!retrieved.created_at,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    !!retrieved.updated_at,
  );
}
