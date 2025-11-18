import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function test_api_admin_product_tag_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Join as an admin to obtain authenticated context
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create the first product tag with a fixed business code
  const tagCode = "black-friday-2025";
  const firstLabel = "Black Friday 2025";

  const firstTagBody = {
    code: tagCode,
    label: firstLabel,
    description: RandomGenerator.paragraph({ sentences: 5 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const firstTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: firstTagBody,
    });
  typia.assert<IShoppingMallProductTag>(firstTag);

  // Validate that the created tag reflects the requested payload where possible
  TestValidator.equals(
    "created tag name should match label",
    firstTag.name,
    firstLabel,
  );

  // Only assert basic slug validity (non-empty string), avoiding assumptions
  // about how slug is derived from code or label.
  TestValidator.predicate(
    "created tag slug should be a non-empty string",
    typeof firstTag.slug === "string" && firstTag.slug.length > 0,
  );

  // 3. Attempt to create a duplicate tag with the same code but different label
  const secondLabel = "Black Friday Campaign 2025";

  const secondTagBody = {
    code: tagCode,
    label: secondLabel,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  await TestValidator.error(
    "duplicate product tag code should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.productTags.create(connection, {
        body: secondTagBody,
      });
    },
  );
}
