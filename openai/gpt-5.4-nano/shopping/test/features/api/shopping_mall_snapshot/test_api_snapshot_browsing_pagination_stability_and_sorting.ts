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

export async function test_api_snapshot_browsing_pagination_stability_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member authorization (join)
  const browsingConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(browsingConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Determine a sourceType with at least some visible snapshots
  const limit = 3 satisfies number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  const candidateSourceTypes = [
    "product",
    "order_item",
    "review",
    "cancellation_request",
    "refund_request",
  ];
  let chosenSourceType: string | undefined;
  for (const sourceType of candidateSourceTypes) {
    const req = {
      sourceType,
      limit,
      page: 1,
      sort: "-created_at",
    } satisfies IShoppingMallSnapshot.IRequest;
    const res = await api.functional.shoppingMall.member.snapshots.index(
      browsingConnection,
      { body: req },
    );
    typia.assert(res);
    if (res.pagination.records > limit) {
      chosenSourceType = sourceType;
      break;
    }
    if (res.data.length > 1 && chosenSourceType === undefined) {
      chosenSourceType = sourceType;
    }
  }
  if (!chosenSourceType) {
    chosenSourceType = "product";
  }
  // 3) Page 1 snapshot ids (ordered)
  const sort = "-created_at";
  const page1Req = {
    sourceType: chosenSourceType,
    limit,
    page: 1,
    sort,
  } satisfies IShoppingMallSnapshot.IRequest;
  const resPage1 = await api.functional.shoppingMall.member.snapshots.index(
    browsingConnection,
    { body: page1Req },
  );
  typia.assert(resPage1);
  const idsPage1 = resPage1.data.map((x) => x.id);
  // 4) Page 2 snapshot ids
  const page2Req = {
    sourceType: chosenSourceType,
    limit,
    page: 2,
    sort,
  } satisfies IShoppingMallSnapshot.IRequest;
  const resPage2 = await api.functional.shoppingMall.member.snapshots.index(
    browsingConnection,
    { body: page2Req },
  );
  typia.assert(resPage2);
  const idsPage2 = resPage2.data.map((x) => x.id);
  // 5) Validate pagination correctness
  const expectedPages =
    resPage1.pagination.records === 0
      ? 0
      : Math.ceil(resPage1.pagination.records / resPage1.pagination.limit);
  TestValidator.equals(
    "page1 pages matches expected",
    resPage1.pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "page2 pagination.records matches page1",
    resPage2.pagination.records,
    resPage1.pagination.records,
  );
  TestValidator.equals(
    "page2 pages matches expected",
    resPage2.pagination.pages,
    expectedPages,
  );
  // No duplicates across pages
  const set1 = new Set(idsPage1);
  const overlap = idsPage2.filter((id) => set1.has(id));
  TestValidator.equals("no overlap between page1 and page2", overlap.length, 0);
  // Union size approaches pagination.records (within at most limit*2)
  const union = new Set([...idsPage1, ...idsPage2]);
  TestValidator.predicate(
    "union size does not exceed total records",
    () => union.size <= resPage1.pagination.records,
  );
  TestValidator.predicate("union size increases when possible", () =>
    resPage1.pagination.records <= resPage1.pagination.limit
      ? union.size === resPage1.pagination.records
      : union.size >=
        Math.min(resPage1.pagination.records, resPage1.pagination.limit + 1),
  );
  // 6) Stability check with identical criteria
  const resPage1Repeat =
    await api.functional.shoppingMall.member.snapshots.index(
      browsingConnection,
      { body: page1Req },
    );
  typia.assert(resPage1Repeat);
  TestValidator.equals(
    "page1 ids stable",
    resPage1Repeat.data.map((x) => x.id),
    idsPage1,
  );
  TestValidator.equals(
    "page1 snapshot_code stable",
    resPage1Repeat.data.map((x) => x.snapshot_code),
    resPage1.data.map((x) => x.snapshot_code),
  );
  TestValidator.equals(
    "page1 created_at stable",
    resPage1Repeat.data.map((x) => x.created_at),
    resPage1.data.map((x) => x.created_at),
  );
  TestValidator.equals(
    "page1 updated_at stable",
    resPage1Repeat.data.map((x) => x.updated_at),
    resPage1.data.map((x) => x.updated_at),
  );
  TestValidator.equals(
    "page1 deleted_at stable",
    resPage1Repeat.data.map((x) => x.deleted_at),
    resPage1.data.map((x) => x.deleted_at),
  );
  // 7) Edge validation: request page beyond available pages (valid shape)
  const beyondPage = Math.max(1, resPage1.pagination.pages + 1);
  const pageBeyondReq = {
    sourceType: chosenSourceType,
    limit,
    page: beyondPage,
    sort,
  } satisfies IShoppingMallSnapshot.IRequest;
  const resBeyond = await api.functional.shoppingMall.member.snapshots.index(
    browsingConnection,
    { body: pageBeyondReq },
  );
  typia.assert(resBeyond);
  TestValidator.equals(
    "beyond records equals page1 records",
    resBeyond.pagination.records,
    resPage1.pagination.records,
  );
  TestValidator.equals(
    "beyond pages equals page1 pages",
    resBeyond.pagination.pages,
    resPage1.pagination.pages,
  );
  TestValidator.predicate(
    "beyond data empty",
    () => resBeyond.data.length === 0,
  );
}
