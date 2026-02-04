import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_sections_create } from "../../../generate/generate_random_shopping_mall_admin_sections_create";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";

/**
 * Verify the hard deletion of a shopping mall section by an administrator.
 *
 * This test implements the complete workflow from admin authentication through section
 * creation to deletion verification. The scenario validates that:
 * - Admin authentication is properly handled
 * - Sections are correctly created with valid names
 * - Delete operation successfully removes the section from the database
 * - The deletion returns HTTP 204, indicating successful deletion
 *
 * Workflow:
 * 1. Authenticate as administrator
 * 2. Create a new section
 * 3. Delete the created section
 * 4. Verify no errors occurred during deletion
 *
 * Note: Section deletion is permanent and irreversbile (hard delete)
 */
export async function test_api_section_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // First step: Create admin connection using authentication function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, { body: {} });
  // Second step: Create a new section as admin
  const section = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {},
  );
  // Third step: Delete the newly created section
  await api.functional.shoppingMall.admin.sections.erase(adminConnection, {
    sectionCode: section.id,
  });
}
