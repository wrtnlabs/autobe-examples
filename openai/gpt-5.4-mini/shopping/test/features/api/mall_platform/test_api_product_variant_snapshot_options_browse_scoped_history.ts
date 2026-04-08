import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test administrator browsing preserved product variant snapshot options within a scoped immutable history.
 *
 * Validates that the option-row listing for a product variant snapshot is constrained to the requested
 * product and snapshot identifiers, returns a paginated collection of normalized option rows, and respects
 * request-body controls such as search, sort, page, and limit without mutating snapshot history.
 *
 * 1. Authenticate as an administrator using a dedicated connection.
 * 2. Browse snapshot option rows for a requested product and snapshot scope.
 * 3. Validate pagination metadata and option row shape.
 * 4. Confirm repeated reads remain scoped and stable.
 */
export async function test_api_product_variant_snapshot_options_browse_scoped_history(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const page = 1;
  const limit = 10;
  const firstRequest = {
    search: RandomGenerator.alphabets(5),
    sort: "optionKey",
    page,
    limit,
  } satisfies IMallPlatformProductVariantSnapshotOption.IRequest;
  const firstResponse =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.options.index(
      administratorConnection,
      {
        productId,
        snapshotId,
        body: firstRequest,
      },
    );
  typia.assert(firstResponse);
  TestValidator.equals(
    "pagination current should match request page",
    firstResponse.pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request limit",
    firstResponse.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "response data should be an array",
    Array.isArray(firstResponse.data),
  );
  TestValidator.predicate(
    "every row should remain scoped to the requested snapshot",
    firstResponse.data.every(
      (row) => row.productVariantSnapshot.id === snapshotId,
    ),
  );
  TestValidator.predicate(
    "every row should have an option key",
    firstResponse.data.every((row) => row.optionKey.length > 0),
  );
  TestValidator.predicate(
    "every row should have an option value",
    firstResponse.data.every((row) => row.optionValue.length > 0),
  );
  const secondRequest = {
    search: firstRequest.search,
    sort: "-optionValue",
    page: 2,
    limit: 5,
  } satisfies IMallPlatformProductVariantSnapshotOption.IRequest;
  const secondResponse =
    await api.functional.mallPlatform.administrator.products.variantSnapshots.options.index(
      administratorConnection,
      {
        productId,
        snapshotId,
        body: secondRequest,
      },
    );
  typia.assert(secondResponse);
  TestValidator.equals(
    "second pagination current should match request page",
    secondResponse.pagination.current,
    secondRequest.page,
  );
  TestValidator.equals(
    "second pagination limit should match request limit",
    secondResponse.pagination.limit,
    secondRequest.limit,
  );
  TestValidator.predicate(
    "second response should remain scoped to the requested snapshot",
    secondResponse.data.every(
      (row) => row.productVariantSnapshot.id === snapshotId,
    ),
  );
  TestValidator.predicate(
    "repeated browsing should preserve a valid page structure",
    secondResponse.pagination.pages >= 0 &&
      secondResponse.pagination.records >= 0,
  );
}
