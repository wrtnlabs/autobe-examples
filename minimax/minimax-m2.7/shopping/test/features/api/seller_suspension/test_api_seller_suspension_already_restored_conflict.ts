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

/**
 * Test that restoring an already restored suspension returns 409 Conflict error.
 *
 * Prerequisites:
 * 1. Register and authenticate as admin
 * 2. Register a seller (who will be suspended)
 * 3. Create a suspension record
 *
 * Test sequence:
 * 1. Admin creates a seller suspension
 * 2. Admin restores the suspension (first restoration - should succeed)
 * 3. Admin attempts to restore the same suspension again
 * 4. Expected: Second restoration attempt returns 409 Conflict error
 *    with error message indicating the suspension was previously lifted
 */
export async function test_api_seller_suspension_already_restored_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "AdminPass123!" as string & tags.Format<"password">,
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create a seller to be suspended
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SellerPass123!" as string & tags.Format<"password">,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  // Extract seller ID from the join response
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await api.functional.ecommerceMall.auth.seller.login(sellerConnection, {
      body: {
        email: (
          await api.functional.ecommerceMall.auth.seller.join(
            sellerConnection,
            {
              body: {
                email: typia.random<string & tags.Format<"email">>(),
                password: "SellerPass123!" as string & tags.Format<"password">,
                href: typia.random<string & tags.Format<"uri">>(),
                referrer: typia.random<string & tags.Format<"uri">>(),
              } satisfies IEcommerceMallSeller.IJoin,
            },
          )
        ).email,
        password: "SellerPass123!" as string & tags.Format<"password">,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    });
  // 3. Create suspension record using the utility function
  const suspension: IEcommerceMallSellerSuspension =
    await generate_random_ecommerce_mall_admin_seller_suspensions_create(
      adminConnection,
      {
        body: {
          seller_id: sellerAuth.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallSellerSuspension.ICreate,
      },
    );
  typia.assert(suspension);
  // 4. First restoration - should succeed
  const firstRestoration: IEcommerceMallSellerSuspension =
    await api.functional.ecommerceMall.admin.seller_suspensions.restore(
      adminConnection,
      {
        suspensionId: suspension.id,
        body: {
          restored_reason: "First restoration - legitimate request",
        } satisfies IEcommerceMallSellerSuspension.IUpdate,
      },
    );
  typia.assert(firstRestoration);
  // Verify suspension was restored
  TestValidator.equals(
    "restored_at should be set",
    firstRestoration.restored_at !== null,
    true,
  );
  TestValidator.equals(
    "restored_by should be set",
    firstRestoration.restored_by !== null &&
      firstRestoration.restored_by !== undefined,
    true,
  );
  // 5. Second restoration attempt - should fail with 409 Conflict
  await TestValidator.httpError(
    "second restoration should return 409 Conflict",
    409,
    async () => {
      await api.functional.ecommerceMall.admin.seller_suspensions.restore(
        adminConnection,
        {
          suspensionId: suspension.id,
          body: {
            restored_reason: "Duplicate restoration attempt",
          } satisfies IEcommerceMallSellerSuspension.IUpdate,
        },
      );
    },
  );
}
