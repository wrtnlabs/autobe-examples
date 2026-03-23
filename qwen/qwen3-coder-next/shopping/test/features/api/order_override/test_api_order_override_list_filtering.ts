import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderOverride";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderOverride } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderOverride";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_order_override_list_filtering(
  connection: api.IConnection,
) {
  // 1. Create admin connection and register/login as super admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test various filter combinations
  const filterTests = [
    {
      name: "all without filter",
      params: { actionType: undefined } as IEcommerceMallOrderOverride.IRequest,
    },
    {
      name: "cancel action only",
      params: { actionType: "cancel" } as IEcommerceMallOrderOverride.IRequest,
    },
    {
      name: "refund action only",
      params: { actionType: "refund" } as IEcommerceMallOrderOverride.IRequest,
    },
    {
      name: "with limit",
      params: { limit: 5 } as IEcommerceMallOrderOverride.IRequest,
    },
    {
      name: "with page",
      params: { page: 1 } as IEcommerceMallOrderOverride.IRequest,
    },
    {
      name: "combined filters",
      params: {
        actionType: "cancel",
        limit: 10,
      } as IEcommerceMallOrderOverride.IRequest,
    },
  ];
  for (const test of filterTests) {
    const result =
      await api.functional.ecommerceMall.admin.order_overrides.index(
        adminConnection,
        {
          body: test.params,
        },
      );
    typia.assert(result);
    typia.assert(result.pagination);
    // Validate pagination structure
    TestValidator.predicate(
      "has valid pagination",
      result.pagination.current >= 0 &&
        result.pagination.limit >= 0 &&
        result.pagination.records >= 0 &&
        result.pagination.pages >= 0,
    );
    // Validate each override summary structure
    for (const override of result.data) {
      typia.assert(override);
      typia.assert(override.admin_user);
      typia.assert(override.customer);
      typia.assert(override.order_item);
      typia.assert(override.order);
      typia.assert(override.seller);
    }
  }
}
