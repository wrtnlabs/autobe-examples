import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallLegalHold } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHold";
import type { IShoppingMallLegalHoldTarget } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLegalHoldTarget";

export async function test_api_admin_legal_hold_target_create_multiple_entity_types(
  connection: api.IConnection,
) {
  // 1. Admin join (also establishes authenticated admin context)
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
  typia.assert(adminAuthorized);

  // 2. Create a new legal hold
  const legalHoldCode: string = `LH-${RandomGenerator.alphaNumeric(12)}`;

  const legalHoldBody = {
    code: legalHoldCode,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    status: "active",
    scope_description: RandomGenerator.paragraph({ sentences: 4 }),
    external_reference: `CASE-${RandomGenerator.alphaNumeric(10)}`,
    effective_from: new Date().toISOString(),
  } satisfies IShoppingMallLegalHold.ICreate;

  const legalHold: IShoppingMallLegalHold =
    await api.functional.shoppingMall.admin.legalHolds.create(connection, {
      body: legalHoldBody,
    });
  typia.assert(legalHold);

  TestValidator.equals(
    "legal hold code should match the request code",
    legalHold.code,
    legalHoldCode,
  );

  // 3. Create customer target under this legal hold
  const customerTargetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const customerTargetBody = {
    target_type: "customer",
    target_id: customerTargetId,
    target_display: `customer:${RandomGenerator.alphaNumeric(8)}`,
    note: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const customerTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: customerTargetBody,
      },
    );
  typia.assert(customerTarget);

  // 4. Create order target under this legal hold
  const orderTargetId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const orderTargetBody = {
    target_type: "order",
    target_id: orderTargetId,
    target_display: `order:${RandomGenerator.alphaNumeric(10)}`,
    note: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IShoppingMallLegalHoldTarget.ICreate;

  const orderTarget: IShoppingMallLegalHoldTarget =
    await api.functional.shoppingMall.admin.legalHolds.targets.create(
      connection,
      {
        legalHoldCode,
        body: orderTargetBody,
      },
    );
  typia.assert(orderTarget);

  // 5. Cross-record validation
  TestValidator.notEquals(
    "customer and order targets should have different id values",
    customerTarget.id,
    orderTarget.id,
  );

  TestValidator.equals(
    "both targets must belong to the same legal hold",
    customerTarget.shopping_mall_legal_hold_id,
    orderTarget.shopping_mall_legal_hold_id,
  );

  TestValidator.equals(
    "customer target_type should be 'customer'",
    customerTarget.target_type,
    "customer",
  );

  TestValidator.equals(
    "order target_type should be 'order'",
    orderTarget.target_type,
    "order",
  );

  TestValidator.equals(
    "customer target_id should match the request UUID",
    customerTarget.target_id,
    customerTargetId,
  );

  TestValidator.equals(
    "order target_id should match the request UUID",
    orderTarget.target_id,
    orderTargetId,
  );
}
