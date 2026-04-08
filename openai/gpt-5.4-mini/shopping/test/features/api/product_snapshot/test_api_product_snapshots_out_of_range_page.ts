import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Verify out-of-range pagination for administrator product snapshot browsing.
 *
 * Validates that an authenticated administrator can request a page beyond the
 * available product snapshot history and still receive a valid paginated
 * response. The test ensures the response remains well-formed, returns an
 * empty data array for the out-of-range page, and preserves pagination
 * metadata consistency for audit-friendly historical browsing.
 *
 * 1. Administrator joins and obtains an authenticated connection.
 * 2. Administrator requests a product snapshot page far beyond the existing range.
 * 3. Validates empty data and stable pagination metadata.
 */
export async function test_api_product_snapshots_out_of_range_page(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request = {
    page: 999999,
    limit: 1,
  } satisfies IMallPlatformProductSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.administrator.productSnapshots.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is echoed",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "out-of-range page returns no snapshots",
    output.data.length,
    0,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    output.pagination.pages >= 0,
  );
}
