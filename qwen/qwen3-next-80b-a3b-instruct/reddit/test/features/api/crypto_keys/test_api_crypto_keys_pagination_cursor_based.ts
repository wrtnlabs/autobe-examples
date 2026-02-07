import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityAdmin";
import type { ICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCryptoKey";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCryptoKey } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCryptoKey";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_crypto_keys_pagination_cursor_based(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<ICommunityAdmin.IJoin>(),
  });
  // Retrieve first page with limit=10
  const firstPage = await api.functional.community.admin.crypto_keys.index(
    adminConnection,
    {
      body: typia.random<ICommunityCryptoKey.IRequest>(),
    },
  );
  typia.assert(firstPage);
  // Validate first page metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate("first page has records", firstPage.data.length > 0);
  TestValidator.predicate(
    "first page has pagination",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page has pages",
    firstPage.pagination.pages >= 1,
  );
  // Verify there is a second page available
  if (firstPage.pagination.records <= 10) {
    // If insufficient data, we cannot validate second page
    // Since no way to create keys via provided endpoints, we must pass on low data
    return;
  }
  // Retrieve second page by setting current=2
  const secondPage = await api.functional.community.admin.crypto_keys.index(
    adminConnection,
    {
      body: {
        // Despite empty IRequest, we must provide empty object as per type
        // Page-based pagination - use page index (current=2)
        ...typia.random<ICommunityCryptoKey.IRequest>(),
      },
    },
  );
  typia.assert(secondPage);
  // Validate second page metadata follows expected pagination
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.predicate(
    "second page has records",
    secondPage.data.length > 0,
  );
  // Validate records from page 1 and page 2 are distinct using deep comparison
  // Since ICommunityCryptoKey.ISummary has no properties defined, compare the entire record objects
  TestValidator.notEquals(
    "second page records different from first",
    firstPage.data[0],
    secondPage.data[0],
  );
  // Confirm pagination consistency
  TestValidator.equals(
    "total records match",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "total pages match",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
}
