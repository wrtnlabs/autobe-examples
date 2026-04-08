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

export async function test_api_product_snapshot_history_browse(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `admin-${RandomGenerator.alphaNumeric(8)}@test.com` as string &
        tags.Format<"email">,
      password: `P@ssw0rd-${RandomGenerator.alphaNumeric(8)}` as string &
        tags.Format<"password">,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 10,
    sort: "-createdAt",
    productId,
  } satisfies IMallPlatformProductSnapshot.IRequest;
  const history =
    await api.functional.mallPlatform.administrator.productSnapshots.history.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(history);
  const repeated =
    await api.functional.mallPlatform.administrator.productSnapshots.history.index(
      adminConnection,
      {
        body: request,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "pagination current page",
    history.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", history.pagination.limit, 10);
  TestValidator.predicate(
    "pagination record count is non-negative",
    history.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination page count is non-negative",
    history.pagination.pages >= 0,
  );
  TestValidator.equals(
    "same record count on repeated read",
    history.pagination.records,
    repeated.pagination.records,
  );
  TestValidator.equals(
    "same page count on repeated read",
    history.pagination.pages,
    repeated.pagination.pages,
  );
  TestValidator.equals(
    "same snapshot count on repeated read",
    history.data.length,
    repeated.data.length,
  );
  for (let i = 0; i < history.data.length; i++) {
    const snapshot = history.data[i];
    TestValidator.equals(
      `snapshot ${i} product id`,
      snapshot.product.id,
      productId,
    );
    if (i > 0) {
      TestValidator.predicate(
        `snapshot ${i} is not newer than previous snapshot`,
        snapshot.createdAt <= history.data[i - 1].createdAt,
      );
    }
  }
  if (history.data.length > 0) {
    const first = history.data[0];
    TestValidator.predicate(
      "snapshot kind is present",
      first.snapshotKind.length > 0,
    );
    TestValidator.predicate(
      "snapshot product name is present",
      first.productName.length > 0,
    );
    TestValidator.predicate(
      "snapshot product description is present",
      first.productDescription.length > 0,
    );
    TestValidator.predicate(
      "snapshot category name is valid when present or null",
      first.categoryName === null || first.categoryName.length >= 0,
    );
    TestValidator.predicate(
      "snapshot base price is non-negative",
      first.basePrice >= 0,
    );
    TestValidator.predicate(
      "snapshot image count is non-negative",
      first.imageCount >= 0,
    );
    TestValidator.predicate(
      "snapshot variant count is non-negative",
      first.variantCount >= 0,
    );
    TestValidator.predicate(
      "snapshot createdAt is present",
      first.createdAt.length > 0,
    );
  }
  TestValidator.equals("repeated read is stable", history, repeated);
}
