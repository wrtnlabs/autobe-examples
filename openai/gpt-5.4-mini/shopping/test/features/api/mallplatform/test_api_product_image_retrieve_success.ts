import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_image_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const imageId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const output = await api.functional.mallPlatform.products.images.at(
    connection,
    {
      productId,
      imageId,
    },
  );
  typia.assert(output);
  TestValidator.equals("image id matches request", output.id, imageId);
  TestValidator.equals(
    "owning product id matches request",
    output.product.id,
    productId,
  );
  TestValidator.predicate("image url is non-empty", output.imageUrl.length > 0);
  TestValidator.predicate(
    "sort order is an integer",
    Number.isInteger(output.sortOrder),
  );
  TestValidator.equals(
    "main image flag is boolean contextually valid",
    typeof output.isMain,
    "boolean",
  );
  TestValidator.predicate(
    "created timestamp exists",
    output.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp exists",
    output.updatedAt.length > 0,
  );
  TestValidator.equals(
    "deletedAt is null for an active image",
    output.deletedAt,
    null,
  );
  TestValidator.predicate(
    "product summary has seller account",
    output.product.sellerAccount.id.length > 0,
  );
  TestValidator.predicate(
    "product summary has name",
    output.product.name.length > 0,
  );
  TestValidator.predicate(
    "product summary has description",
    output.product.description.length > 0,
  );
  TestValidator.predicate(
    "product summary has base price",
    Number.isFinite(output.product.basePrice),
  );
  TestValidator.predicate(
    "product summary has creation timestamp",
    output.product.createdAt.length > 0,
  );
  TestValidator.predicate(
    "product summary has update timestamp",
    output.product.updatedAt.length > 0,
  );
  TestValidator.equals(
    "product summary deletedAt is null",
    output.product.deletedAt,
    null,
  );
}
