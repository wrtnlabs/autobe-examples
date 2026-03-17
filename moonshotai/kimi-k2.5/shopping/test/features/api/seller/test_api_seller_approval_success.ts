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
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_seller_approval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 2. Setup seller with known credentials for later verification
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies Partial<IEcommerceMallSeller.IJoin>,
  });
  // Verify initial status is pending
  TestValidator.equals(
    "initial approval status is pending",
    seller.approvalStatus,
    "pending",
  );
  // 3. Submit seller registration with business details
  await generate_random_ecommerce_mall_seller_registrations_create(
    sellerConnection,
    {},
  );
  // 4. Admin approves the seller
  const approvedSeller =
    await api.functional.ecommerceMall.admin.sellers.status.updateStatus(
      adminConnection,
      {
        sellerId: seller.id,
        body: {
          approvalStatus: "approved",
        } satisfies IEcommerceMallSeller.IUpdateStatus,
      },
    );
  typia.assert(approvedSeller);
  // 5. Verify seller can now login with approved status
  const checkConnection: api.IConnection = { host: connection.host };
  const loggedInSeller = await authorize_seller_login(checkConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Validate approval status changed to approved
  TestValidator.equals(
    "approval status updated to approved",
    loggedInSeller.approvalStatus,
    "approved",
  );
  TestValidator.equals(
    "seller ID remains consistent",
    loggedInSeller.id,
    seller.id,
  );
  TestValidator.predicate(
    "createdAt timestamp is valid",
    new Date(loggedInSeller.createdAt).getTime() > 0,
  );
  TestValidator.predicate(
    "updatedAt reflects change",
    new Date(loggedInSeller.updatedAt).getTime() >=
      new Date(seller.updatedAt).getTime(),
  );
}
