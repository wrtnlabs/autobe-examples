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

/**
 * Test retrieving a demotion audit record by its unique identifier after a successful administrator demotion action.
 *
 * This test validates that:
 * 1. A super administrator can demote another super administrator to regular admin
 * 2. The demotion creates an audit record with action type 'demotion'
 * 3. The audit record can be retrieved by its unique ID
 * 4. The retrieved record contains correct admin, performer, reason, and timestamp information
 */
export async function test_api_admin_promotion_retrieval_demotion_record(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register first super administrator account (already authenticated after join)
  const firstSuperAdminConnection: api.IConnection = { host: connection.host };
  const firstSuperAdmin = await authorize_super_admin_join(
    firstSuperAdminConnection,
    {},
  );
  // Step 2: Register second super administrator account
  const secondSuperAdminConnection: api.IConnection = { host: connection.host };
  const secondSuperAdmin = await authorize_super_admin_join(
    secondSuperAdminConnection,
    {},
  );
  // Step 3: Demote the second super administrator using the first super admin's connection
  const demotionReason = "Performance review required demotion";
  const demotionRecord =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admins.demote(
      firstSuperAdminConnection,
      {
        adminId: secondSuperAdmin.id,
        body: {
          reason: demotionReason,
        } satisfies IEcommerceMallAdminPromotion.IDemote,
      },
    );
  typia.assert(demotionRecord);
  // Step 4: Retrieve the demotion record using the extracted ID
  const retrievedRecord =
    await api.functional.ecommerceMall.superAdmin.superAdmin.admin_promotions.at(
      firstSuperAdminConnection,
      {
        promotionId: demotionRecord.id,
      },
    );
  typia.assert(retrievedRecord);
  // Validation: Verify the retrieved record matches the demotion record
  TestValidator.equals(
    "demotion record ID matches",
    retrievedRecord.id,
    demotionRecord.id,
  );
  TestValidator.equals(
    "action is demotion",
    retrievedRecord.action,
    "demotion",
  );
  TestValidator.equals(
    "admin ID matches demoted admin",
    retrievedRecord.admin.id,
    secondSuperAdmin.id,
  );
  TestValidator.equals(
    "reason matches provided reason",
    retrievedRecord.reason,
    demotionReason,
  );
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedRecord.created_at),
  );
  TestValidator.equals(
    "performer ID matches demoting super admin",
    retrievedRecord.performedBySuperAdmin.id,
    firstSuperAdmin.id,
  );
}
