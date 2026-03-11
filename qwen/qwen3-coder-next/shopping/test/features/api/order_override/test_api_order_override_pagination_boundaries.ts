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

export async function test_api_order_override_pagination_boundaries(
  connection: api.IConnection,
): Promise<void> {
  // 1. Login as regular admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Test pagination on empty list first
  const emptyPage =
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {
          limit: 25,
          page: 1,
        } satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty list pagination",
    emptyPage.pagination.records,
    0,
  );
  TestValidator.equals("empty list pages", emptyPage.pagination.pages, 0);
  // 3. Test pagination edge cases with empty data
  const beyondPage =
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {
          page: 999999,
        } satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  typia.assert(beyondPage);
  TestValidator.equals(
    "beyond range page data empty",
    beyondPage.data.length,
    0,
  );
  TestValidator.equals(
    "beyond range page metadata",
    beyondPage.pagination.current,
    999999,
  );
  // 4. Test cursor-based pagination on empty list
  const cursorPage =
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {
          limit: 25,
        } satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  typia.assert(cursorPage);
  TestValidator.equals("cursor pagination works", cursorPage.data.length, 0);
  // 5. Test different page sizes
  const page10 = await api.functional.ecommerceMall.admin.order_overrides.index(
    adminConnection,
    {
      body: {
        limit: 10,
        page: 1,
      } satisfies IEcommerceMallOrderOverride.IRequest,
    },
  );
  typia.assert(page10);
  TestValidator.equals("page size 10", page10.pagination.limit, 10);
  const page50 = await api.functional.ecommerceMall.admin.order_overrides.index(
    adminConnection,
    {
      body: {
        limit: 50,
        page: 1,
      } satisfies IEcommerceMallOrderOverride.IRequest,
    },
  );
  typia.assert(page50);
  TestValidator.equals("page size 50", page50.pagination.limit, 50);
  // 6. Test default page behavior
  const defaultPage =
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {} satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.equals("default page is 1", defaultPage.pagination.current, 1);
  // 7. Test page boundary conditions
  await TestValidator.error("invalid page number", async () => {
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {
          page: -1,
        } satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  });
  await TestValidator.error("invalid limit number", async () => {
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {
          limit: 0,
        } satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  });
  await TestValidator.error("limit exceeds maximum", async () => {
    await api.functional.ecommerceMall.admin.order_overrides.index(
      adminConnection,
      {
        body: {
          limit: 101,
        } satisfies IEcommerceMallOrderOverride.IRequest,
      },
    );
  });
}
