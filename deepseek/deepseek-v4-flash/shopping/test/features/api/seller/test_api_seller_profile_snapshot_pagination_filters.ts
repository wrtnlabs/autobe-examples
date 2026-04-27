import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_profile_snapshot_pagination_filters(
  connection: api.IConnection,
): Promise<void> {
  //----
  // Prepare seller connection
  //----
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(authorized);
  //----
  // TestCase A - Default Parameters (no body)
  //----
  {
    const page =
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        sellerConnection,
        {
          body: {} satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      "pagination.current (default)",
      page.pagination.current,
      1,
    );
    TestValidator.equals("data length (default)", page.data.length, 0);
    TestValidator.equals("records (default)", page.pagination.records, 0);
    TestValidator.equals("pages (default)", page.pagination.pages, 0);
  }
  //----
  // TestCase B - Custom Pagination (page=1, limit=10)
  //----
  {
    const page =
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        sellerConnection,
        {
          body: {
            page: 1,
            limit: 10,
          } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      "pagination.current (page=1,limit=10)",
      page.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination.limit (page=1,limit=10)",
      page.pagination.limit,
      10,
    );
    TestValidator.equals("data length (page=1,limit=10)", page.data.length, 0);
  }
  //----
  // TestCase C - Second Page Request (page=2, limit=5)
  //----
  {
    const page =
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        sellerConnection,
        {
          body: {
            page: 2,
            limit: 5,
          } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      "pagination.current (page=2,limit=5)",
      page.pagination.current,
      2,
    );
    TestValidator.equals(
      "pagination.limit (page=2,limit=5)",
      page.pagination.limit,
      5,
    );
    TestValidator.equals(
      "pagination.records (page=2,limit=5)",
      page.pagination.records,
      0,
    );
    TestValidator.equals(
      "pagination.pages (page=2,limit=5)",
      page.pagination.pages,
      0,
    );
    TestValidator.equals("data length (page=2,limit=5)", page.data.length, 0);
  }
  //----
  // TestCase D - Maximum Limit (limit=100)
  //----
  {
    const page =
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        sellerConnection,
        {
          body: {
            page: 1,
            limit: 100,
          } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals(
      "pagination.limit (limit=100)",
      page.pagination.limit,
      100,
    );
    TestValidator.equals("data length (limit=100)", page.data.length, 0);
  }
  //----
  // TestCase E - Date Range Filter (gte only)
  //----
  {
    const page =
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        sellerConnection,
        {
          body: {
            created_at: {
              gte: "2026-01-01T00:00:00.000Z",
            },
          } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals("records (gte only)", page.pagination.records, 0);
    TestValidator.equals("data length (gte only)", page.data.length, 0);
  }
  //----
  // TestCase F - Date Range Filter (gte and lte)
  //----
  {
    const page =
      await api.functional.eCommerceMall.seller.profile.snapshots.index(
        sellerConnection,
        {
          body: {
            created_at: {
              gte: "2026-01-01T00:00:00.000Z",
              lte: "2026-12-31T23:59:59.000Z",
            },
          } satisfies IECommerceMallSellerProfileSnapshot.IRequest,
        },
      );
    typia.assert(page);
    TestValidator.equals("records (gte+lte)", page.pagination.records, 0);
    TestValidator.equals("data length (gte+lte)", page.data.length, 0);
  }
}
