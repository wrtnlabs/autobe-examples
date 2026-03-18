import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_product_snapshots_search_sort_default_and_deleted_at_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization via join
  const memberConnection: api.IConnection = { host: connection.host };
  const password = "Passw0rd!";
  const email = `${RandomGenerator.alphaNumeric(10)}@test.com`;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: email satisfies string & tags.Format<"email">,
      password: password satisfies string & tags.Format<"password">,
    },
  });
  typia.assert(memberAuth);
  // Use a fresh actor-specific connection that includes auth header
  const authConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(authConnection, {
    body: {
      email: memberAuth.email,
      password: password satisfies IShoppingMallMember.IJoin["password"],
    },
  });
  // 2) Test needs at least two snapshots for one product, and at least
  // one of them soft-deleted. There is no SDK/generator provided to create
  // products or snapshots in this prompt, so we rely on existing seeded data.
  // We'll discover candidates by searching for any snapshots and then narrow
  // by product_id from the first results.
  const initialPage =
    await api.functional.shoppingMall.member.productSnapshots.search(
      authConnection,
      {
        body: {
          sourceType: "product_snapshots",
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(initialPage);
  TestValidator.predicate(
    "at least one snapshot exists for test setup",
    initialPage.data.length > 0,
  );
  const productId = initialPage.data[0]
    ?.shopping_mall_product_id satisfies string & tags.Format<"uuid">;
  // 3) Call endpoint without sort to trigger default created_at DESC
  const page = await api.functional.shoppingMall.member.productSnapshots.search(
    authConnection,
    {
      body: {
        sourceType: "product_snapshots",
        productId: productId,
        page: 1,
        limit: 20,
      } satisfies IShoppingMallProductSnapshot.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.predicate(
    "response includes at least 2 snapshots",
    page.data.length >= 2,
  );
  // 4) Validate created_at ordering non-increasing
  const createdAts = page.data.map((x) => x.created_at);
  for (let i = 1; i < createdAts.length; i++) {
    const prev = new Date(createdAts[i - 1]);
    const curr = new Date(createdAts[i]);
    TestValidator.predicate(
      `created_at ordering non-increasing at index ${i}`,
      prev.getTime() >= curr.getTime(),
    );
  }
  // 5) Validate soft-delete semantics and updated_at existence
  for (const item of page.data) {
    typia.assert(item);
    TestValidator.predicate(
      "updated_at exists",
      item.updated_at !== undefined && item.updated_at !== null,
    );
    if (item.deleted_at !== null) {
      TestValidator.predicate(
        "deleted_at non-null when soft-deleted",
        item.deleted_at !== null,
      );
    } else {
      TestValidator.predicate(
        "deleted_at null when not soft-deleted",
        item.deleted_at === null,
      );
    }
  }
  // 6) Edge case: narrow time window to likely return empty page
  const now = new Date();
  const from = new Date(now.getTime() + 60000);
  const to = new Date(now.getTime() + 120000);
  const emptyPage =
    await api.functional.shoppingMall.member.productSnapshots.search(
      authConnection,
      {
        body: {
          sourceType: "product_snapshots",
          productId: productId,
          createdAtFrom: from.toISOString() satisfies string &
            tags.Format<"date-time">,
          createdAtTo: to.toISOString() satisfies string &
            tags.Format<"date-time">,
          page: 1,
          limit: 20,
        } satisfies IShoppingMallProductSnapshot.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
}
