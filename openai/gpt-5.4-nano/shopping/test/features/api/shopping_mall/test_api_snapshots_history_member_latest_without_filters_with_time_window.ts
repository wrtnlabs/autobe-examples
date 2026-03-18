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

export async function test_api_snapshots_history_member_latest_without_filters_with_time_window(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register & authorize a member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2) Query latest snapshot history without any linkage filters
  const createdAtFrom = new Date(
    Date.now() - 30 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date().toISOString();
  const req = {
    page: 1,
    limit: 5,
    createdAtFrom,
    createdAtTo,
  } satisfies IShoppingMallSnapshot.IRequest;
  const historyPage =
    await api.functional.shoppingMall.member.snapshots.history(
      memberConnection,
      { body: req },
    );
  typia.assert(historyPage);
  // 3) Validate pagination & ordering
  TestValidator.predicate(
    "data length should be <= limit",
    () => historyPage.data.length <= req.limit!,
  );
  TestValidator.predicate(
    "records should be >= data length",
    () => historyPage.pagination.records >= historyPage.data.length,
  );
  TestValidator.predicate("pages should be coherent with records/limit", () => {
    const expectedPages =
      historyPage.pagination.records === 0
        ? 0
        : Math.ceil(
            historyPage.pagination.records / historyPage.pagination.limit,
          );
    return historyPage.pagination.pages === expectedPages;
  });
  // Deterministic ordering: created_at desc when sort omitted
  for (let i = 1; i < historyPage.data.length; ++i) {
    const prev = new Date(historyPage.data[i - 1].created_at).getTime();
    const curr = new Date(historyPage.data[i].created_at).getTime();
    TestValidator.predicate(
      `created_at should be descending at index ${i}`,
      () => prev >= curr,
    );
  }
  // 4) Validate created_at bounds (inclusive)
  const fromTs = new Date(createdAtFrom).getTime();
  const toTs = new Date(createdAtTo).getTime();
  for (const item of historyPage.data) {
    const createdAtTs = new Date(item.created_at).getTime();
    TestValidator.predicate(
      "created_at within inclusive bounds",
      () => createdAtTs >= fromTs && createdAtTs <= toTs,
    );
  }
  // 5) Edge case: if no results within window, expect empty page metadata
  if (historyPage.data.length === 0) {
    TestValidator.equals(
      "records should be 0 when no data",
      historyPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "pages should be 0 when no data",
      historyPage.pagination.pages,
      0,
    );
  }
}
