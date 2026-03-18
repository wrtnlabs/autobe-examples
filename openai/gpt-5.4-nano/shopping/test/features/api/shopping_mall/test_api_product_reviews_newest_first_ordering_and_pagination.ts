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

export async function test_api_product_reviews_newest_first_ordering_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Sign up a new member via join
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized: IShoppingMallMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
      } satisfies IShoppingMallMember.IJoin,
    });
  const authConnection: api.IConnection = { host: connection.host };
  authConnection.headers = {
    Authorization: authorized.token.access,
  };
  // 2) Pick a productId from fixtures (best-effort).
  // If your environment preloads a dedicated product fixture, replace this with that fixture id.
  const productId = typia.random<string & tags.Format<"uuid">>();
  // 3) Call reviews list (default pagination)
  const page1 = await api.functional.shoppingMall.member.products.reviews.list(
    authConnection,
    { productId },
  );
  typia.assert(page1);
  // 4) Validate newest-first ordering (when we have >=2 items)
  if (page1.data.length >= 2) {
    for (let i = 0; i + 1 < page1.data.length; i++) {
      TestValidator.predicate(
        `newest-first ordering by updatedAt at index ${i}`,
        new Date(page1.data[i].updatedAt).getTime() >=
          new Date(page1.data[i + 1].updatedAt).getTime(),
      );
    }
  }
  // Validate pagination consistency
  const { pagination } = page1;
  const computedPages =
    pagination.records === 0 || pagination.limit === 0
      ? 0
      : Math.ceil(pagination.records / pagination.limit);
  TestValidator.equals(
    "pagination.pages consistent with records/limit",
    pagination.pages,
    computedPages,
  );
  // 5) Call endpoint again (no page/limit params exposed in this SDK signature)
  const page2 = await api.functional.shoppingMall.member.products.reviews.list(
    authConnection,
    { productId },
  );
  typia.assert(page2);
  // 6) Cross-call consistency: returned set should be identical for identical request.
  const ids1 = page1.data.map((r) => r.id).sort();
  const ids2 = page2.data.map((r) => r.id).sort();
  TestValidator.equals("second call returns same page data", ids2, ids1);
}
