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

export async function test_api_wishlist_index_pagination_metadata_multi_wishlist_consistency(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  // Authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(16);
  await authorize_member_join(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IShoppingMallMember.IJoin,
  });
  const limit = 2 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const page1 = 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  const page2 = 2 satisfies number & tags.Type<"int32"> & tags.Minimum<1>;
  // Execute page 1
  const response1 = await api.functional.shoppingMall.member.wishlists.index(
    memberConnection,
    {
      body: { page: page1, limit } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(response1);
  // Execute page 2
  const response2 = await api.functional.shoppingMall.member.wishlists.index(
    memberConnection,
    {
      body: { page: page2, limit } satisfies IShoppingMallWishlist.IRequest,
    },
  );
  typia.assert(response2);
  // Validate pagination metadata for page 1
  TestValidator.equals(
    "pagination.current (page1)",
    response1.pagination.current,
    page1,
  );
  TestValidator.equals(
    "pagination.limit (page1)",
    response1.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.pages (page1)",
    response1.pagination.pages,
    Math.ceil(response1.pagination.records / response1.pagination.limit),
  );
  // Validate pagination metadata for page 2
  TestValidator.equals(
    "pagination.current (page2)",
    response2.pagination.current,
    page2,
  );
  TestValidator.equals(
    "pagination.limit (page2)",
    response2.pagination.limit,
    limit,
  );
  TestValidator.equals(
    "pagination.pages (page2)",
    response2.pagination.pages,
    Math.ceil(response2.pagination.records / response2.pagination.limit),
  );
  // Data size bounds
  TestValidator.predicate(
    "data length <= limit (page1)",
    response1.data.length <= response1.pagination.limit,
  );
  TestValidator.predicate(
    "data length <= limit (page2)",
    response2.data.length <= response2.pagination.limit,
  );
  // Internal consistency across pages
  TestValidator.equals(
    "records consistent across pages",
    response2.pagination.records,
    response1.pagination.records,
  );
}
