import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_variants_filtered_pagination(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId = typia.random<string & tags.Format<"uuid">>();
  const request: IMallPlatformProductSnapshotVariant.IRequest = {
    search: "SKU",
    page: 1,
    limit: 2,
  };
  const output =
    await api.functional.mallPlatform.administrator.productSnapshots.variants.index(
      adminConnection,
      {
        productSnapshotId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "requested page is reflected",
    output.pagination.current,
    request.page,
  );
  TestValidator.equals(
    "requested limit is reflected",
    output.pagination.limit,
    request.limit,
  );
  TestValidator.predicate(
    "records and pages are non-negative",
    output.pagination.records >= 0 && output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "page size does not exceed limit",
    output.data.length <= output.pagination.limit,
  );
  for (const row of output.data) {
    TestValidator.predicate(
      "search term matches preserved snapshot variant",
      row.skuCode.includes(request.search ?? "") ||
        row.optionValues.includes(request.search ?? ""),
    );
    TestValidator.predicate(
      "row belongs to requested snapshot",
      row.productSnapshot.id === productSnapshotId,
    );
  }
  const emptyPage =
    await api.functional.mallPlatform.administrator.productSnapshots.variants.index(
      adminConnection,
      {
        productSnapshotId,
        body: {
          ...request,
          page: output.pagination.pages + 1,
        },
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "out-of-range page returns no data",
    emptyPage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-range page preserves total record count",
    emptyPage.pagination.records,
    output.pagination.records,
  );
}
