import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_mall_platform_administrator_product_snapshots_images_create } from "../../../generate/generate_random_mall_platform_administrator_product_snapshots_images_create";
import { prepare_random_mall_platform_product_snapshot_image } from "../../../prepare/prepare_random_mall_platform_product_snapshot_image";

export async function test_api_product_snapshot_images_list_history(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: `${RandomGenerator.alphabets(8)}@test.com` as string,
      password: `${RandomGenerator.alphaNumeric(12)}!` as string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const productSnapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const createdImages = await ArrayUtil.asyncRepeat(4, async (index) => {
    const response =
      await generate_random_mall_platform_administrator_product_snapshots_images_create(
        adminConnection,
        {
          params: { productSnapshotId },
          body: {
            imageUri: `https://example.com/snapshot/${index + 1}.jpg`,
            sortOrder: index,
          } satisfies IMallPlatformProductSnapshotImage.ICreate,
        },
      );
    typia.assert(response);
    return response;
  });
  const firstPage =
    await api.functional.mallPlatform.administrator.productSnapshots.images.index(
      adminConnection,
      {
        productSnapshotId,
        body: {
          page: 1,
          limit: 2,
        } satisfies IMallPlatformProductSnapshotImage.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.administrator.productSnapshots.images.index(
      adminConnection,
      {
        productSnapshotId,
        body: {
          page: 2,
          limit: 2,
        } satisfies IMallPlatformProductSnapshotImage.IRequest,
      },
    );
  typia.assert(secondPage);
  const orderedCreated = [...createdImages].sort(
    (x, y) => x.sortOrder - y.sortOrder,
  );
  const combined = [...firstPage.data, ...secondPage.data];
  TestValidator.equals("first page size", firstPage.data.length, 2);
  TestValidator.equals("second page size", secondPage.data.length, 2);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("pagination limit", firstPage.pagination.limit, 2);
  TestValidator.equals("pagination records", firstPage.pagination.records, 4);
  TestValidator.equals("pagination pages", firstPage.pagination.pages, 2);
  TestValidator.equals("second page records", secondPage.pagination.records, 4);
  TestValidator.equals("second page pages", secondPage.pagination.pages, 2);
  TestValidator.equals(
    "first page order",
    firstPage.data.map((row) => row.sortOrder),
    [0, 1],
  );
  TestValidator.equals(
    "second page order",
    secondPage.data.map((row) => row.sortOrder),
    [2, 3],
  );
  TestValidator.equals(
    "combined order",
    combined.map((row) => row.sortOrder),
    [0, 1, 2, 3],
  );
  TestValidator.equals(
    "preserved image uris",
    combined.map((row) => row.imageUri),
    orderedCreated.map((row) => row.imageUri),
  );
  TestValidator.equals(
    "preserved snapshot ids",
    combined.map((row) => row.productSnapshot.id),
    orderedCreated.map((row) => row.productSnapshot.id),
  );
  for (const row of combined) {
    typia.assert(row.productSnapshot);
    TestValidator.equals(
      "row snapshot id matches",
      row.productSnapshot.id,
      productSnapshotId,
    );
    TestValidator.predicate("row has createdAt", row.createdAt.length > 0);
    TestValidator.predicate(
      "row has snapshot product reference",
      row.productSnapshot.product.id.length > 0,
    );
  }
}
