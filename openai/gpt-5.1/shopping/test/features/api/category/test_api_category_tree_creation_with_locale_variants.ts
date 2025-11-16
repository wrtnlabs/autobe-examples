import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategoryTree } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategoryTree";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate creation of multiple category trees with different defaultLocale
 * values.
 *
 * Business context: Platform administrators must be able to configure separate
 * category trees per region/locale (for example, an EU catalog vs. a
 * Korea-specific catalog). Each tree is a top-level catalog configuration
 * identified by a globally unique business code, with optional locale and
 * activation flags.
 *
 * This E2E test ensures that a single platform admin can create multiple
 * category trees, each with different `defaultLocale` values, and that the
 * system correctly stores and exposes this configuration without conflicts.
 *
 * Test steps:
 *
 * 1. Register a new platform admin using POST /auth/platformAdmin/join.
 *
 *    - Use a realistic email, name, password, and tracking fields (href, referrer).
 *    - Rely on SDK to attach the issued access token to the connection.
 * 2. Define multiple IShoppingMallCategoryTree.ICreate payloads for distinct trees
 *    (e.g., EU and KR catalogs):
 *
 *    - Each payload must have a unique `code`.
 *    - Name/description should make the region obvious.
 *    - Active should be explicitly true/false for at least one variant to ensure the
 *         optional flag is honored.
 *    - DefaultLocale must vary between payloads (e.g., "en-GB" and "ko-KR").
 * 3. Call api.functional.shoppingMall.platformAdmin.categoryTrees.create for each
 *    payload and capture the IShoppingMallCategoryTree responses.
 * 4. For each response:
 *
 *    - Run typia.assert to validate the runtime structure.
 *    - Assert that `code`, `name`, and (when provided) `description` match the
 *         request payload.
 *    - Assert that `defaultLocale` equals the requested locale string or is
 *         undefined/null when omitted from the request.
 *    - Assert that `active` reflects the requested value when provided; when
 *         omitted, just validate it is a boolean (business default left to
 *         backend).
 * 5. Validate coexistence and independence:
 *
 *    - Ensure all returned ids are distinct.
 *    - Ensure codes differ, and that each response’s defaultLocale is the one
 *         requested for that specific code.
 *
 * Error scenarios:
 *
 * - The test does not attempt to create conflicting codes or invalid types, as
 *   type-error-based testing is forbidden. It focuses on the happy-path
 *   creation and logical field verification.
 */
export async function test_api_category_tree_creation_with_locale_variants(
  connection: api.IConnection,
) {
  // 1. Register a platform admin via join endpoint.
  const joinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare multiple category tree create payloads with distinct locales.
  const createPayloads: IShoppingMallCategoryTree.ICreate[] = [
    {
      code: `EU-CATALOG-${RandomGenerator.alphaNumeric(6)}`,
      name: "EU Regional Catalog",
      description: RandomGenerator.paragraph({ sentences: 4 }),
      active: true,
      defaultLocale: "en-GB",
    },
    {
      code: `KR-CATALOG-${RandomGenerator.alphaNumeric(6)}`,
      name: "Korea Catalog",
      description: RandomGenerator.paragraph({ sentences: 4 }),
      active: false,
      defaultLocale: "ko-KR",
    },
    {
      code: `GLOBAL-CATALOG-${RandomGenerator.alphaNumeric(6)}`,
      name: "Global Catalog",
      description: RandomGenerator.paragraph({ sentences: 3 }),
      // Intentionally omit active and defaultLocale to rely on backend defaults.
    },
  ];

  // 3. Create category trees and collect responses.
  const createdTrees: IShoppingMallCategoryTree[] = [];

  for (const payload of createPayloads) {
    const tree: IShoppingMallCategoryTree =
      await api.functional.shoppingMall.platformAdmin.categoryTrees.create(
        connection,
        {
          body: payload,
        },
      );
    typia.assert(tree);
    createdTrees.push(tree);

    // 4.a Field-level assertions per tree.
    TestValidator.equals(
      "category tree code should match request",
      tree.code,
      payload.code,
    );
    TestValidator.equals(
      "category tree name should match request",
      tree.name,
      payload.name,
    );

    if (payload.description !== undefined) {
      TestValidator.equals(
        "category tree description should match when provided",
        tree.description ?? undefined,
        payload.description,
      );
    }

    if (payload.defaultLocale !== undefined) {
      TestValidator.equals(
        "defaultLocale should match requested value when provided",
        tree.defaultLocale,
        payload.defaultLocale,
      );
    }

    if (payload.active !== undefined) {
      TestValidator.equals(
        "active flag should match requested value when provided",
        tree.active,
        payload.active,
      );
    }
  }

  // 5. Validate coexistence and independence of trees.
  // Ensure all ids are distinct.
  const ids = createdTrees.map((t) => t.id);
  const uniqueIds = new Set(ids);
  TestValidator.equals(
    "all created category tree ids should be unique",
    uniqueIds.size,
    ids.length,
  );

  // Ensure codes are distinct and bound to their locales correctly.
  const [euTree, krTree, globalTree] = createdTrees;

  TestValidator.predicate(
    "EU and KR category tree codes should differ",
    euTree.code !== krTree.code,
  );

  TestValidator.equals(
    "EU tree should have en-GB as defaultLocale",
    euTree.defaultLocale,
    "en-GB",
  );

  TestValidator.equals(
    "KR tree should have ko-KR as defaultLocale",
    krTree.defaultLocale,
    "ko-KR",
  );

  TestValidator.predicate("EU tree should be active", euTree.active === true);
  TestValidator.predicate(
    "KR tree should be inactive",
    krTree.active === false,
  );

  // Global tree: we only assert structural integrity and that fields are
  // logically independent from EU/KR trees.
  TestValidator.predicate(
    "global catalog should have a distinct code",
    globalTree.code !== euTree.code && globalTree.code !== krTree.code,
  );
}
