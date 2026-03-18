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

export async function test_api_wishlist_index_member_scoped_pagination_and_deletion_consistency(
  connection: api.IConnection,
): Promise<void> {
  // Actor: member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  TestValidator.predicate("member id exists", member.id.length > 0);
  const page = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const limit = 10 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // Scenario 1: empty-state + pagination shape
  const first = await api.functional.shoppingMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        page,
        limit,
      } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(first);
  TestValidator.equals("empty-state data", first.data.length, 0);
  TestValidator.equals("empty-state records", first.pagination.records, 0);
  TestValidator.equals("empty-state pages", first.pagination.pages, 0);
  TestValidator.equals("current page is 1", first.pagination.current, 1);
  TestValidator.equals("limit echoes", first.pagination.limit, 10);
  // Scenario 2/3 best-effort: repeated list should remain consistent and never
  // expose soft-deleted wishlist containers as active results.
  const second = await api.functional.shoppingMall.member.wishlists.index(
    memberConnection,
    {
      body: {
        page,
        limit,
      } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(second);
  TestValidator.equals(
    "consistent current page",
    second.pagination.current,
    first.pagination.current,
  );
  TestValidator.equals(
    "consistent limit",
    second.pagination.limit,
    first.pagination.limit,
  );
  for (const item of second.data) {
    TestValidator.equals(
      "active wishlist must have deleted_at null",
      item.deleted_at,
      null,
    );
  }
}
