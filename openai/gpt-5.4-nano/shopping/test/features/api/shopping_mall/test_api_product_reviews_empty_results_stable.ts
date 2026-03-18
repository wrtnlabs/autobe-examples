import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallReview";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_reviews_empty_results_stable(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a new member via POST /shoppingMall/auth/member/join.
  const memberConnection: api.IConnection = { host: connection.host };
  const password = typia.random<string & tags.Format<"password">>();
  const member: IShoppingMallMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password,
      } satisfies IShoppingMallMember.IJoin,
    },
  );
  typia.assert(member);
  // 2) Choose a productId that exists but has zero reviews.
  // Note: no product-creation utilities are available in the provided inputs,
  // so we rely on the API's behavior for products that currently have no
  // reviews.
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3) Call reviews list.
  const first: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.member.products.reviews.list(
      memberConnection,
      {
        productId,
      },
    );
  typia.assert(first);
  // 4) Validate response for empty results.
  TestValidator.equals("first data empty", first.data.length, 0);
  TestValidator.equals("first pagination records", first.pagination.records, 0);
  TestValidator.equals("first pagination pages", first.pagination.pages, 0);
  TestValidator.predicate(
    "first pagination current is present",
    typeof first.pagination.current === "number",
  );
  TestValidator.predicate(
    "first pagination limit is present",
    typeof first.pagination.limit === "number",
  );
  // 5) Call again and validate stability.
  const second: IPageIShoppingMallReview.ISummary =
    await api.functional.shoppingMall.member.products.reviews.list(
      memberConnection,
      {
        productId,
      },
    );
  typia.assert(second);
  TestValidator.equals("second data empty", second.data.length, 0);
  TestValidator.equals(
    "second pagination records",
    second.pagination.records,
    0,
  );
  TestValidator.equals("second pagination pages", second.pagination.pages, 0);
  TestValidator.equals(
    "pagination current stable",
    second.pagination.current,
    first.pagination.current,
  );
  TestValidator.equals(
    "pagination limit stable",
    second.pagination.limit,
    first.pagination.limit,
  );
}
