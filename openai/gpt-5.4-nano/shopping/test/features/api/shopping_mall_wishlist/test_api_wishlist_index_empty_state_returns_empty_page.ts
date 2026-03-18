import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_wishlist_index_empty_state_returns_empty_page(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization (new member with no wishlists)
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});
  typia.assert(authorized);
  // 2) Call wishlists index with explicit pagination
  const page = 1 satisfies IShoppingMallWishlist.IRequest["page"];
  const limit = 10 satisfies IShoppingMallWishlist.IRequest["limit"];
  const output = await api.functional.shoppingMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        page,
        limit,
      } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(output);
  // 3) Validate empty state & pagination metadata
  TestValidator.equals("data is empty", output.data.length, 0);
  TestValidator.equals(
    "pagination.records is zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals("pagination.pages is zero", output.pagination.pages, 0);
  TestValidator.equals(
    "pagination.current is page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit is limit",
    output.pagination.limit,
    limit,
  );
}
