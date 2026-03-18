import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_item_admin_oversight_soft_deleted_visibility_semantics(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authentication (create an admin to ensure authorization)
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });

  // 2) Obtain pre-seeded order item identifiers from the harness.
  // These are expected to be injected into globalThis by the test runner.
  const globals: Record<string, unknown> = globalThis as Record<
    string,
    unknown
  >;
  const orderItemIdSoftDeletedRaw = globals.__seed_order_item_id_soft_deleted;
  const orderItemIdActiveRaw = globals.__seed_order_item_id_active;
  const orderItemIdSoftDeleted = typia.assert(
    orderItemIdSoftDeletedRaw,
  ) as unknown as string & tags.Format<"uuid">;
  const orderItemIdActive = typia.assert(
    orderItemIdActiveRaw,
  ) as unknown as string & tags.Format<"uuid">;

  // 3) Soft-deleted record semantics
  let softDeletedResponse: IShoppingMallOrderItem | undefined;
  let softDeletedNotFound = false;
  try {
    softDeletedResponse =
      await api.functional.shoppingMall.admin.admin.order_items.at(
        adminConnection,
        {
          orderItemId: orderItemIdSoftDeleted,
        },
      );
    typia.assert(softDeletedResponse);
  } catch (exp) {
    const status =
      typeof exp === "object" && exp !== null && "status" in exp
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (exp as any).status
        : undefined;

    if (status === 404) {
      softDeletedNotFound = true;
    } else {
      throw exp;
    }
  }

  TestValidator.predicate(
    "soft-deleted semantics: either 404 or deletedAt is non-null",
    softDeletedNotFound ||
      (softDeletedResponse !== undefined &&
        softDeletedResponse.deletedAt !== null),
  );

  // 5) Active record semantics
  const activeResponse =
    await api.functional.shoppingMall.admin.admin.order_items.at(
      adminConnection,
      {
        orderItemId: orderItemIdActive,
      },
    );
  typia.assert(activeResponse);

  TestValidator.equals(
    "active record deletedAt is null",
    activeResponse.deletedAt,
    null,
  );
}
