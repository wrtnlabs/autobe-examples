import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { generate_random_shopping_mall_super_admin_sections_create } from "../../../generate/generate_random_shopping_mall_super_admin_sections_create";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_section_creation_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a super admin connection and authenticate via join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Create a section using the authenticated super admin connection
  const section =
    await generate_random_shopping_mall_super_admin_sections_create(
      superAdminConnection,
      {
        body: {
          name: "Electronics",
          description: "Consumer electronics and gadgets",
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(section);
  // Step 3: Validate section properties with schema-compliant property names and types
  TestValidator.equals("section name matches", section.name, "Electronics");
  TestValidator.equals(
    "sectionId is UUID format",
    section.categoryId,
    section.categoryId,
  );
  if (section.description !== null && section.description !== undefined) {
    TestValidator.equals(
      "description matches",
      section.description,
      "Consumer electronics and gadgets",
    );
  }
}
