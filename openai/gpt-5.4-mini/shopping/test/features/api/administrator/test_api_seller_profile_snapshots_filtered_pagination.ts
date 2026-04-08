import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfile";
import type { IMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerProfileSnapshot";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformSellerProfileSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_seller_profile_snapshots_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verify administrator can browse seller profile snapshot history with
   * filtering, pagination, and ordering controls.
   *
   * This scenario validates that snapshot history is read-only, respects the
   * requested search criteria, returns coherent pagination metadata, and can
   * produce an empty page when no historical records match the search text.
   *
   * 1. Register an administrator and create an isolated authenticated
   *    connection.
   * 2. Request seller profile snapshots using a random search key, bounded page
   *    size, and descending order.
   * 3. Validate pagination metadata and snapshot row ordering for the returned
   *    page.
   * 4. Request a page with a search term that is extremely unlikely to match
   *    and confirm an empty, valid page response.
   */
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const filteredRequest = {
    search: RandomGenerator.alphabets(12),
    page: 1,
    limit: 10,
    sort: "createdAt",
    order: "desc",
  } satisfies IMallPlatformSellerProfileSnapshot.IRequest;
  const filteredPage =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.index(
      adminConnection,
      {
        body: filteredRequest,
      },
    );
  typia.assert(filteredPage);
  TestValidator.equals(
    "filtered page current matches request",
    filteredPage.pagination.current,
    filteredRequest.page,
  );
  TestValidator.equals(
    "filtered page limit matches request",
    filteredPage.pagination.limit,
    filteredRequest.limit,
  );
  TestValidator.predicate(
    "filtered page records are non-negative",
    filteredPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered page total pages are non-negative",
    filteredPage.pagination.pages >= 0,
  );
  if (filteredPage.data.length > 1) {
    for (let i = 1; i < filteredPage.data.length; ++i) {
      TestValidator.predicate(
        "filtered snapshots are sorted by newest first",
        filteredPage.data[i - 1].createdAt >= filteredPage.data[i].createdAt,
      );
    }
  }
  const emptyRequest = {
    search: RandomGenerator.alphabets(24),
    page: 1,
    limit: 5,
    sort: "createdAt",
    order: "desc",
  } satisfies IMallPlatformSellerProfileSnapshot.IRequest;
  const emptyPage =
    await api.functional.mallPlatform.administrator.sellerProfileSnapshots.index(
      adminConnection,
      {
        body: emptyRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 5);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page data", emptyPage.data.length, 0);
}
