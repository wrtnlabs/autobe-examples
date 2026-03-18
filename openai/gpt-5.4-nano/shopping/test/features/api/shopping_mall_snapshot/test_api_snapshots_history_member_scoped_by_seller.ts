import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSnapshot";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_snapshots_history_member_scoped_by_seller(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers ??= {};
  authConnection.headers.Authorization = memberAuth.token.access;
  const sellerScopeSourceSellerId = typia.random<
    string & tags.Format<"uuid">
  >();
  const sourceType = RandomGenerator.alphabets(10);
  const page1Body = {
    sourceType,
    sourceSellerId: sellerScopeSourceSellerId,
    page: 1 satisfies
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | undefined,
    limit: 10 satisfies
      | (number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>)
      | undefined,
  } satisfies IShoppingMallSnapshot.IRequest;
  const page1 = await api.functional.shoppingMall.member.snapshots.history(
    authConnection,
    { body: page1Body },
  );
  typia.assert(page1);
  TestValidator.predicate(
    "pagination current is non-negative",
    page1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    page1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    page1.pagination.pages >= 0,
  );
  if (page1.data.length > 0) {
    for (const item of page1.data) {
      TestValidator.equals(
        "seller-scoped snapshots must match requested source_seller_id",
        item.source_seller_id,
        sellerScopeSourceSellerId,
      );
    }
  } else {
    TestValidator.equals("empty result data", page1.data.length, 0);
  }
  const page2Body = {
    ...page1Body,
    page: 2 satisfies
      | (number & tags.Type<"int32"> & tags.Minimum<1>)
      | undefined,
  } satisfies IShoppingMallSnapshot.IRequest;
  const page2 = await api.functional.shoppingMall.member.snapshots.history(
    authConnection,
    { body: page2Body },
  );
  typia.assert(page2);
  TestValidator.equals(
    "records coherent across pages",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "pages coherent across pages",
    page2.pagination.pages,
    page1.pagination.pages,
  );
  if (page2.data.length > 0) {
    for (const item of page2.data) {
      TestValidator.equals(
        "seller-scoped snapshots on page 2 must match",
        item.source_seller_id,
        sellerScopeSourceSellerId,
      );
    }
  }
}
