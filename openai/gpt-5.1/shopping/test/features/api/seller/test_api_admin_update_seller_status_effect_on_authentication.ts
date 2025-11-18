import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_update_seller_status_effect_on_authentication(
  connection: api.IConnection,
) {
  // 1. Register an admin to obtain admin authorization context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Register a seller with known credentials
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromJoin);

  const sellerId: string & tags.Format<"uuid"> = sellerAuthorizedFromJoin.id;

  // 3. Verify seller can login successfully before status change
  const loginBodyActive = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBodyActive,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorizedFromLogin);

  TestValidator.equals(
    "seller id from join and login should match",
    sellerAuthorizedFromLogin.id,
    sellerAuthorizedFromJoin.id,
  );

  // 4. Switch back to admin context by reusing admin join (token is set in SDK)
  //    Note: We call admin.join again only if needed, but the earlier call
  //    already set the Authorization header to admin. To be explicit, we
  //    perform an admin join again to ensure admin context is active.
  const adminRejoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorizedAgain);

  // 5. Admin updates seller status to a non-active value (e.g., "suspended")
  const suspendedStatus = "suspended";
  const updateToSuspendedBody = {
    status: suspendedStatus,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSellerSuspended: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: sellerId,
      body: updateToSuspendedBody,
    });
  typia.assert<IShoppingMallSeller>(updatedSellerSuspended);

  TestValidator.equals(
    "updated seller id should match original seller id",
    updatedSellerSuspended.id,
    sellerId,
  );
  TestValidator.equals(
    "seller status should be updated to suspended",
    updatedSellerSuspended.status,
    suspendedStatus,
  );

  // 6. Attempt to login again as the suspended seller - expect rejection
  const loginBodySuspended = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  await TestValidator.error(
    "suspended seller should not be able to login",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: loginBodySuspended,
      });
    },
  );

  // 7. Edge condition: toggle only email_verified while keeping status suspended
  const toggleEmailVerifiedBody = {
    email_verified: !updatedSellerSuspended.email_verified,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSellerEmailVerifiedOnly: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: sellerId,
      body: toggleEmailVerifiedBody,
    });
  typia.assert<IShoppingMallSeller>(updatedSellerEmailVerifiedOnly);

  TestValidator.equals(
    "status should remain suspended when only email_verified is changed",
    updatedSellerEmailVerifiedOnly.status,
    suspendedStatus,
  );

  // Confirm login is still rejected despite email_verified change
  const loginBodyAfterEmailToggle = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  await TestValidator.error(
    "changing email_verified alone should not re-enable login while status is suspended",
    async () => {
      await api.functional.auth.seller.login(connection, {
        body: loginBodyAfterEmailToggle,
      });
    },
  );

  // 8. Optionally, revert seller status back to active and confirm login resumes
  const activeStatus = "active";
  const updateToActiveBody = {
    status: activeStatus,
  } satisfies IShoppingMallSeller.IUpdate;

  const updatedSellerActive: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: sellerId,
      body: updateToActiveBody,
    });
  typia.assert<IShoppingMallSeller>(updatedSellerActive);

  TestValidator.equals(
    "seller status should be updated back to active",
    updatedSellerActive.status,
    activeStatus,
  );

  // Login should now succeed again for the seller
  const loginBodyActiveAgain = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedAfterReactivation: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBodyActiveAgain,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(
    sellerAuthorizedAfterReactivation,
  );

  TestValidator.equals(
    "seller id after reactivation login should still match original id",
    sellerAuthorizedAfterReactivation.id,
    sellerId,
  );
}
