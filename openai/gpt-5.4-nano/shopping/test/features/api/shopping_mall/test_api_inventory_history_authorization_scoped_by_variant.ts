import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_inventory_history_authorization_scoped_by_variant(
  connection: api.IConnection,
): Promise<void> {
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // Find a variant id that returns records for memberA and memberB.
  const memberAOwnPage =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberAConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(memberAOwnPage);
  TestValidator.predicate(
    "memberA should have at least one inventory record to validate scoping",
    memberAOwnPage.pagination.records > 0,
  );
  const memberAVariantId: string =
    memberAOwnPage.data[0]!.shopping_mall_product_variant_id;
  const memberBOwnPage =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberBConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(memberBOwnPage);
  TestValidator.predicate(
    "memberB should have at least one inventory record to validate scoping",
    memberBOwnPage.pagination.records > 0,
  );
  const memberBVariantId: string =
    memberBOwnPage.data[0]!.shopping_mall_product_variant_id;
  // As memberA, try to query memberB's variant.
  const leakCheckPage =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberAConnection,
      {
        body: {
          productVariantId: memberBVariantId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(leakCheckPage);
  TestValidator.equals(
    "scoped records should be empty",
    leakCheckPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "scoped returned data should be empty",
    leakCheckPage.data.length,
    0,
  );
  // Control: As memberA, query its own variant.
  const controlPage =
    await api.functional.shoppingMall.member.inventoryRecords.index(
      memberAConnection,
      {
        body: {
          productVariantId: memberAVariantId,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(controlPage);
  TestValidator.predicate(
    "memberA should see records for its own variant",
    controlPage.pagination.records > 0,
  );
}
