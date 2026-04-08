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

export async function test_api_seller_suspension_restore_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Submit admin request to create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      actorType: "seller",
      requestedGrade: "admin",
      reason: RandomGenerator.paragraph({ sentences: 5 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Register a new seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  // 3. Create seller suspension
  const suspension =
    await generate_random_ecommerce_mall_admin_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          sellerId: seller.id,
          reason: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  // 4. Verify suspension record has restoredAt as null (currently suspended)
  typia.assert(suspension);
  TestValidator.equals("restoredAt is null", suspension.restoredAt, null);
  TestValidator.equals(
    "restoredBy is null",
    suspension.restoredBy ?? null,
    null,
  );
  // 5. Restore the suspended seller
  const restoredSuspension =
    await api.functional.ecommerceMall.admin.admin.seller_suspensions.restore(
      adminConnection,
      {
        suspensionId: suspension.id,
        body: {
          restoredReason: "Seller has complied with platform policies",
        } satisfies IEcommerceMallSellerSuspension.IRestore,
      },
    );
  typia.assert(restoredSuspension);
  // 6. Validate the response with restored fields
  TestValidator.predicate(
    "restoredAt is populated",
    restoredSuspension.restoredAt !== null &&
      restoredSuspension.restoredAt !== undefined,
  );
  TestValidator.predicate(
    "restoredBy is populated",
    restoredSuspension.restoredBy !== null &&
      restoredSuspension.restoredBy !== undefined,
  );
  TestValidator.equals(
    "restoredReason matches",
    restoredSuspension.restoredReason,
    "Seller has complied with platform policies",
  );
  TestValidator.predicate(
    "updatedAt is set",
    restoredSuspension.updatedAt !== null &&
      restoredSuspension.updatedAt !== undefined,
  );
  // 7. Verify seller in response
  TestValidator.equals(
    "seller id matches",
    restoredSuspension.seller.id,
    suspension.seller.id,
  );
}