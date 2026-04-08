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
import { generate_random_ecommerce_mall_admin_admin_seller_suspensions_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_seller_suspensions_create";
import { prepare_random_ecommerce_mall_seller_suspension } from "../../../prepare/prepare_random_ecommerce_mall_seller_suspension";

export async function test_api_seller_suspension_retrieve_active(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin via login
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminHref = typia.random<string & tags.Format<"uri">>();
  const adminReferrer = typia.random<string & tags.Format<"uri">>();
  // First, create admin via join request
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 3 }),
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // Then login as admin
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 2. Register a seller account to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 3. Create a seller suspension with a reason
  const suspensionReason = RandomGenerator.paragraph({ sentences: 2 });
  const suspension =
    await generate_random_ecommerce_mall_admin_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          sellerId: sellerJoinResult.id,
          reason: suspensionReason satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<1000>,
        },
      },
    );
  typia.assert(suspension);
  // 4. Retrieve the suspension details by its UUID
  const retrievedSuspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.at(
      adminConnection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrievedSuspension);
  // 5. Validate response structure for active suspension
  // Validate suspension id matches
  TestValidator.equals(
    "suspension id matches",
    retrievedSuspension.id,
    suspension.id,
  );
  // Validate reason is present
  TestValidator.equals(
    "reason matches",
    retrievedSuspension.reason,
    suspensionReason,
  );
  // Validate suspendedAt timestamp exists
  TestValidator.predicate(
    "suspendedAt timestamp exists",
    !!retrievedSuspension.suspendedAt,
  );
  // Validate restoredAt is null (indicating active suspension)
  TestValidator.equals(
    "restoredAt is null for active suspension",
    retrievedSuspension.restoredAt,
    null,
  );
  // Validate nested seller object with email and approval_status
  TestValidator.equals(
    "seller email matches",
    retrievedSuspension.seller.email,
    sellerJoinResult.email,
  );
  TestValidator.equals(
    "seller approval_status exists",
    typeof retrievedSuspension.seller.approvalStatus,
    "string",
  );
  // Validate nested suspendedBy admin object with name and is_super_admin
  TestValidator.equals(
    "suspendedBy name exists",
    typeof retrievedSuspension.suspendedBy.name,
    "string",
  );
  TestValidator.predicate(
    "is_super_admin is boolean",
    typeof retrievedSuspension.suspendedBy.is_super_admin === "boolean",
  );
}
