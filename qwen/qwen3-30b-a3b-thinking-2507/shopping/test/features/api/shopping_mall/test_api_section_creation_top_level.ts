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

export async function test_api_section_creation_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection for section creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: `${RandomGenerator.name(1)}@example.com`,
      password: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      phone: RandomGenerator.mobile(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create a top-level section with valid name length
  const sectionName = `${RandomGenerator.name(1)} Section`;
  const section = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {
      body: {
        name: sectionName,
        parentSectionId: null,
      },
    },
  );
  // 3. Validate the section was created
  typia.assert(section);
  // 4. Verify the section is top-level (no parent)
  TestValidator.equals("section has no parent", section.parentSection, null);
  // 5. Verify the name was set correctly
  TestValidator.equals("section name matches input", section.name, sectionName);
  // 6. Verify name length constraint (minimum 3 characters)
  TestValidator.predicate("section name length >= 3", section.name.length >= 3);
}
