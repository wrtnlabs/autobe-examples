import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test browsing categories with include_deleted filter for soft-deleted entries.
 *
 * Validates that the administrator category browsing endpoint correctly handles the include_deleted filter. By default, soft-deleted categories are excluded from results. When include_deleted=true is specified, soft-deleted categories appear in results with their deleted_at timestamp populated.
 *
 * The test creates a 'Seasonal' category, soft-deletes it, then verifies its visibility in both filtered modes. It confirms that the deleted category's summary includes all standard fields with a non-null deleted_at value.
 *
 * 1. Register as administrator and acquire authentication tokens.
 * 2. Create a top-level category named 'Seasonal'.
 * 3. Soft-delete the 'Seasonal' category.
 * 4. Browse without include_deleted — verify 'Seasonal' is absent.
 * 5. Browse with include_deleted=true — verify 'Seasonal' is present with non-null deleted_at.
 * 6. Validate all response fields via typia.assert.
 */
export async function test_api_category_browse_including_deleted(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(admin);
  // 2. Create a category named 'Seasonal'
  const category =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: "Seasonal" as any,
        },
      },
    );
  typia.assert(category);
  // 3. Delete the 'Seasonal' category (soft-delete)
  await api.functional.eCommerceMall.administrator.categories.erase(
    adminConnection,
    {
      categoryId: category.id,
    },
  );
  // 4. Browse without include_deleted — 'Seasonal' should NOT be in results
  const withoutDeleted =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {} satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(withoutDeleted);
  const seasonalWithoutDeleted = withoutDeleted.data.find(
    (c) => c.id === category.id,
  );
  TestValidator.predicate(
    "deleted category excluded without include_deleted",
    () => seasonalWithoutDeleted === undefined,
  );
  // 5. Browse with include_deleted=true — 'Seasonal' should be present
  const withDeleted =
    await api.functional.eCommerceMall.administrator.categories.index(
      adminConnection,
      {
        body: {
          include_deleted: true,
        } satisfies IECommerceMallCategory.IRequest,
      },
    );
  typia.assert(withDeleted);
  const seasonalWithDeleted = withDeleted.data.find(
    (c) => c.id === category.id,
  );
  TestValidator.predicate(
    "deleted category included when include_deleted=true",
    () => seasonalWithDeleted !== undefined,
  );
  // 6. Verify deleted_at is non-null and full structure validates
  const deletedCategory = seasonalWithDeleted!;
  typia.assert(deletedCategory);
  TestValidator.predicate(
    "deleted category has non-null deleted_at timestamp",
    () => deletedCategory.deleted_at !== null,
  );
  TestValidator.predicate(
    "deleted category retains its name",
    () => deletedCategory.name === "Seasonal",
  );
}
