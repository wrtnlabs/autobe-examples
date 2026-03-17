import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerRegistration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerRegistration";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_seller_registrations_create } from "../../../generate/generate_random_ecommerce_mall_seller_registrations_create";
import { prepare_random_ecommerce_mall_seller_registration } from "../../../prepare/prepare_random_ecommerce_mall_seller_registration";

export async function test_api_super_admin_seller_registration_rejection_with_reason(
  connection: api.IConnection,
) {
  // 1. Create super admin and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.ecommerceMall.auth.superAdmin.join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<(string & tags.Format<"ipv4">) | null>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  // 2. Create a seller and create a pending registration
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  const pendingRegistration =
    await generate_random_ecommerce_mall_seller_registrations_create(
      sellerConnection,
      {},
    );
  typia.assert(pendingRegistration);
  // 3. Super admin rejects the registration with a specific reason
  const rejectionReason = RandomGenerator.paragraph({ sentences: 3 });
  const registrationId = (pendingRegistration as any).id;
  const rejectedRegistration =
    await api.functional.ecommerceMall.superAdmin.seller_registrations.update(
      adminConnection,
      {
        registrationId: registrationId,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        } satisfies IEcommerceMallSellerRegistration.IUpdate,
      },
    );
  typia.assert(rejectedRegistration);
  // 4. Validate rejection was recorded correctly
  const result = rejectedRegistration as any;
  TestValidator.equals("status changed to rejected", result.status, "rejected");
  TestValidator.equals(
    "rejection reason persisted correctly",
    result.rejection_reason,
    rejectionReason,
  );
  TestValidator.predicate(
    "reviewed_at timestamp is defined",
    result.reviewed_at !== undefined && result.reviewed_at !== null,
  );
  TestValidator.predicate(
    "reviewer_id is set to super admin",
    result.reviewer_id !== undefined && result.reviewer_id !== null,
  );
}
