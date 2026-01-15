import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_product_tag_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Use adminConnection to retrieve a product tag by code
  // Tag code must be a valid code from the system (using a known good tag code pattern)
  const tagCode = "new-arrival";
  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.tags.at(adminConnection, {
      tagCode: tagCode,
    });
  // Step 3: Validate the response conforms to IShoppingMallProductTag structure
  typia.assert(tag);
  // Step 4: Validate tag metadata fields
  TestValidator.equals("tag code matches request", tag.tag.slug, tagCode);
  TestValidator.predicate("tag is active", tag.tag.is_active);
  TestValidator.predicate("tag has a name", tag.tag.name.length > 0);
  TestValidator.predicate("tag has a category", tag.tag.category.length > 0);
  TestValidator.predicate("tag has a usage count", tag.tag.usage_count >= 0);
  // Step 5: Validate associated product and tag relationships
  TestValidator.predicate(
    "product has a valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tag.product.id,
    ),
  );
  TestValidator.predicate("product has a name", tag.product.name.length > 0);
  TestValidator.predicate("product has a price", tag.product.price >= 0);
  TestValidator.predicate(
    "product has a thumbnail_url",
    tag.product.thumbnail_url !== undefined,
  );
  TestValidator.predicate(
    "product has a category_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tag.product.category_id,
    ),
  );
  TestValidator.predicate(
    "product has a brand_id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      tag.product.brand_id,
    ),
  );
}
