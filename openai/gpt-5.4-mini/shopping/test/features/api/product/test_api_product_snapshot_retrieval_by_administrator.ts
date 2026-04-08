import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_snapshot_retrieval_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test administrator retrieval of an immutable product snapshot.
   *
   * Verifies that an administrator can retrieve a historical product snapshot
   * and that the response preserves the product's state as it existed when the
   * snapshot was created. The scenario validates read-only snapshot retrieval,
   * immutable historical values, and the expected snapshot schema returned by
   * the administrator-only endpoint.
   *
   * 1. Register an administrator and establish an authenticated admin connection.
   * 2. Request a product snapshot using path identifiers that represent a stored
   *    historical product revision.
   * 3. Validate the returned snapshot schema and preserved values.
   * 4. Confirm the response is a historical snapshot payload suitable for
   *    administrator review.
   */
  const registeredAdminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(
    registeredAdminConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@example.com` satisfies string,
        password: "P@ssw0rd1234!" satisfies string,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorizedAdmin);
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: authorizedAdmin.token.access,
    },
  };
  const productId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const categoryName = `Category ${RandomGenerator.alphabets(6)}`;
  const productName = `Original Product ${RandomGenerator.alphabets(6)}`;
  const productDescription = RandomGenerator.paragraph({ sentences: 2 });
  const basePrice = 12000;
  const mainImageUri = "https://example.com/images/product-main.jpg";
  const imageCount = 3;
  const variantCount = 2;
  const createdAt = new Date().toISOString();
  const snapshot =
    await api.functional.mallPlatform.administrator.products.snapshots.at(
      adminConnection,
      {
        productId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals("snapshot id", snapshot.id, snapshotId);
  TestValidator.equals("linked product id", snapshot.product.id, productId);
  TestValidator.equals(
    "snapshot kind",
    snapshot.snapshotKind,
    snapshot.snapshotKind,
  );
  TestValidator.equals(
    "preserved product name",
    snapshot.productName,
    snapshot.productName,
  );
  TestValidator.equals(
    "preserved product description",
    snapshot.productDescription,
    snapshot.productDescription,
  );
  TestValidator.equals(
    "category name",
    snapshot.categoryName,
    snapshot.categoryName,
  );
  TestValidator.equals("base price", snapshot.basePrice, snapshot.basePrice);
  TestValidator.equals(
    "main image uri",
    snapshot.mainImageUri,
    snapshot.mainImageUri,
  );
  TestValidator.equals("image count", snapshot.imageCount, snapshot.imageCount);
  TestValidator.equals(
    "variant count",
    snapshot.variantCount,
    snapshot.variantCount,
  );
  TestValidator.equals("created at", snapshot.createdAt, snapshot.createdAt);
  TestValidator.predicate(
    "snapshot kind exists",
    snapshot.snapshotKind.length > 0,
  );
  TestValidator.predicate(
    "product name preserved",
    snapshot.productName.length > 0,
  );
  TestValidator.predicate(
    "snapshot timestamp is present",
    snapshot.createdAt.length > 0,
  );
  TestValidator.notEquals(
    "snapshot product name should not equal current edited name",
    snapshot.productName,
    `${productName} updated`,
  );
  TestValidator.notEquals(
    "snapshot description should not equal current edited description",
    snapshot.productDescription,
    `${productDescription} updated`,
  );
  TestValidator.notEquals(
    "snapshot base price should not equal current edited price",
    snapshot.basePrice,
    basePrice + 3000,
  );
  TestValidator.notEquals(
    "snapshot image count should not equal current edited count",
    snapshot.imageCount,
    imageCount + 1,
  );
  TestValidator.notEquals(
    "snapshot variant count should not equal current edited count",
    snapshot.variantCount,
    variantCount + 1,
  );
  TestValidator.notEquals(
    "snapshot timestamp should not equal a later edited timestamp",
    snapshot.createdAt,
    new Date(Date.now() + 1000).toISOString(),
  );
  TestValidator.equals(
    "historical category name preserved",
    snapshot.categoryName,
    categoryName,
  );
  TestValidator.equals(
    "historical main image uri preserved",
    snapshot.mainImageUri,
    mainImageUri,
  );
  TestValidator.equals(
    "historical image count preserved",
    snapshot.imageCount,
    imageCount,
  );
  TestValidator.equals(
    "historical variant count preserved",
    snapshot.variantCount,
    variantCount,
  );
  TestValidator.equals(
    "historical base price preserved",
    snapshot.basePrice,
    basePrice,
  );
  TestValidator.equals(
    "historical product name preserved",
    snapshot.productName,
    productName,
  );
  TestValidator.equals(
    "historical product description preserved",
    snapshot.productDescription,
    productDescription,
  );
}
