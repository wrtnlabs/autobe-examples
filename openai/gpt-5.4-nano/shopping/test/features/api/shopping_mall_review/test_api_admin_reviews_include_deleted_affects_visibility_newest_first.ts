import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reviews_include_deleted_affects_visibility_newest_first(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, {
    body: credentials,
  });
  const includeDeletedResult =
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
        includeDeleted: true,
        sort: "newest",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(includeDeletedResult);
  TestValidator.predicate(
    "all returned items participate in newest-first ordering (updatedAt then createdAt) when includeDeleted=true",
    () => {
      for (let i = 1; i < includeDeletedResult.data.length; i++) {
        const prev = includeDeletedResult.data[i - 1];
        const curr = includeDeletedResult.data[i];
        const prevUpdated = new Date(prev.updatedAt).getTime();
        const currUpdated = new Date(curr.updatedAt).getTime();
        if (prevUpdated < currUpdated) return false;
        if (prevUpdated === currUpdated) {
          const prevCreated = new Date(prev.createdAt).getTime();
          const currCreated = new Date(curr.createdAt).getTime();
          if (prevCreated < currCreated) return false;
        }
      }
      return true;
    },
  );
  const includeDeletedRecords = includeDeletedResult.pagination.records;
  const includeActiveResult =
    await api.functional.shoppingMall.admin.reviews.index(adminConnection, {
      body: {
        page: 1,
        limit: 20,
        includeDeleted: false,
        sort: "newest",
      } satisfies IShoppingMallReview.IRequest,
    });
  typia.assert(includeActiveResult);
  TestValidator.predicate("no deleted reviews when includeDeleted=false", () =>
    includeActiveResult.data.every((r) => r.deletedAt === null),
  );
  TestValidator.predicate(
    "pagination.records for active-only should be <= includeDeleted=true",
    () => includeActiveResult.pagination.records <= includeDeletedRecords,
  );
  TestValidator.predicate(
    "newest-first ordering (updatedAt then createdAt) when includeDeleted=false",
    () => {
      for (let i = 1; i < includeActiveResult.data.length; i++) {
        const prev = includeActiveResult.data[i - 1];
        const curr = includeActiveResult.data[i];
        const prevUpdated = new Date(prev.updatedAt).getTime();
        const currUpdated = new Date(curr.updatedAt).getTime();
        if (prevUpdated < currUpdated) return false;
        if (prevUpdated === currUpdated) {
          const prevCreated = new Date(prev.createdAt).getTime();
          const currCreated = new Date(curr.createdAt).getTime();
          if (prevCreated < currCreated) return false;
        }
      }
      return true;
    },
  );
}
