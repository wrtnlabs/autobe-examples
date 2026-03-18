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

export async function test_api_product_snapshots_search_member_filters_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2) Search with filters
  // productId must refer to an existing product that has at least one snapshot.
  // This environment/setup step is not provided in the inputs.
  const productId = typia.random<string & tags.Format<"uuid">>();
  const createdAtFrom = new Date(
    Date.now() - 1000 * 60 * 60 * 24 * 7,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const createdAtTo = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  const body: IShoppingMallProductSnapshot.IRequest = {
    // Snapshot source discriminator for product snapshots.
    sourceType: "product",
    productId,
    page: 1,
    limit: 10,
    createdAtFrom,
    createdAtTo,
  };
  const output =
    await api.functional.shoppingMall.member.productSnapshots.search(
      memberConnection,
      {
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate("data should be array", Array.isArray(output.data));
  if (output.data.length > 0) {
    const first = output.data[0]!;
    for (const item of output.data) {
      TestValidator.equals(
        "shopping_mall_product_id matches productId filter",
        item.shopping_mall_product_id,
        productId,
      );
      TestValidator.predicate(
        "snapshot created_at is a date-time string",
        !!item.created_at,
      );
    }
    // 3) Tighten window to exclude returned snapshots
    const tightenedFrom = new Date(
      new Date(first.created_at).getTime() + 2,
    ).toISOString() satisfies string & tags.Format<"date-time">;
    const output2 =
      await api.functional.shoppingMall.member.productSnapshots.search(
        memberConnection,
        {
          body: {
            ...body,
            createdAtFrom: tightenedFrom,
            createdAtTo: tightenedFrom,
          } satisfies IShoppingMallProductSnapshot.IRequest,
        },
      );
    typia.assert(output2);
    TestValidator.equals(
      "pagination current (tightened)",
      output2.pagination.current,
      1,
    );
    TestValidator.equals(
      "pagination limit (tightened)",
      output2.pagination.limit,
      10,
    );
    TestValidator.equals(
      "expected empty data on tightened window",
      output2.data.length,
      0,
    );
  }
}
