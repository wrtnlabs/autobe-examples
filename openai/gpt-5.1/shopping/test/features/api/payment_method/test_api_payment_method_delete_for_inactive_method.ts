import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_payment_method_delete_for_inactive_method(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin via join API
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // Sanity check: admin must be active and have a token
  TestValidator.predicate(
    "platform admin is active after join",
    admin.isActive === true,
  );
  TestValidator.predicate(
    "platform admin token has access token string",
    admin.token.access.length > 0,
  );

  // 2. Create an inactive payment method configuration
  const codeSuffix = RandomGenerator.alphaNumeric(8);
  const createBody = {
    code: `card_inactive_${codeSuffix}`,
    display_name: RandomGenerator.name(2),
    description: null,
    provider_key: `provider_${RandomGenerator.alphaNumeric(6)}`,
    method_type: "card",
    currency_restriction: null,
    min_amount: null,
    max_amount: null,
    priority: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    is_active: false,
    starts_at: null,
    ends_at: null,
  } satisfies IShoppingMallPaymentMethod.ICreate;

  const created =
    await api.functional.shoppingMall.platformAdmin.paymentMethods.create(
      connection,
      { body: createBody },
    );
  typia.assert<IShoppingMallPaymentMethod>(created);

  // Validate key lifecycle-related fields on the created payment method
  TestValidator.equals(
    "created payment method should be inactive",
    created.is_active,
    false,
  );
  TestValidator.predicate(
    "created payment method has non-empty id",
    created.id.length > 0,
  );
  TestValidator.equals(
    "created payment method should not have deleted_at set yet",
    created.deleted_at ?? null,
    null,
  );

  // 3. Delete the inactive payment method
  await api.functional.shoppingMall.platformAdmin.paymentMethods.erase(
    connection,
    {
      paymentMethodId: created.id,
    },
  );

  // 4. We infer successful deletion from the absence of any thrown error above.
}
