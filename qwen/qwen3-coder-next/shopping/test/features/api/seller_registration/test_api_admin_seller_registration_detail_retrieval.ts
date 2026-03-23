import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
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

export async function test_api_admin_seller_registration_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and login as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Create sellers with different approval statuses
  // Create pending seller registration
  const pendingSellerConnection: api.IConnection = { host: connection.host };
  const pendingSeller = await authorize_seller_join(pendingSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Create approved seller registration
  const approvedSellerConnection: api.IConnection = { host: connection.host };
  const approvedSeller = await authorize_seller_join(approvedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Create rejected seller registration
  const rejectedSellerConnection: api.IConnection = { host: connection.host };
  const rejectedSeller = await authorize_seller_join(rejectedSellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // 3. Retrieve registration details and validate
  const pendingRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.at(
      adminConnection,
      {
        sellerRegistrationId: pendingSeller.id,
      },
    );
  typia.assert(pendingRegistration);
  TestValidator.equals(
    "pending status",
    pendingRegistration.approval_status,
    "pending",
  );
  TestValidator.equals(
    "shop name matches",
    pendingRegistration.shop_name,
    pendingSeller.shop_name,
  );
  TestValidator.equals(
    "user ID matches",
    pendingRegistration.user_id,
    pendingSeller.id,
  );
  const approvedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.at(
      adminConnection,
      {
        sellerRegistrationId: approvedSeller.id,
      },
    );
  typia.assert(approvedRegistration);
  TestValidator.equals(
    "approved status",
    approvedRegistration.approval_status,
    "approved",
  );
  TestValidator.equals(
    "shop name matches",
    approvedRegistration.shop_name,
    approvedSeller.shop_name,
  );
  const rejectedRegistration =
    await api.functional.ecommerceMall.admin.seller_registrations.at(
      adminConnection,
      {
        sellerRegistrationId: rejectedSeller.id,
      },
    );
  typia.assert(rejectedRegistration);
  TestValidator.equals(
    "rejected status",
    rejectedRegistration.approval_status,
    "rejected",
  );
  TestValidator.equals(
    "shop name matches",
    rejectedRegistration.shop_name,
    rejectedSeller.shop_name,
  );
  // For rejected registration, validate that rejection reason and response timestamp exist
  TestValidator.predicate(
    "has rejection reason",
    () => rejectedRegistration.rejection_reason !== undefined,
  );
  TestValidator.predicate(
    "has response timestamp",
    () => rejectedRegistration.responded_at !== undefined,
  );
}
