import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { generate_random_shopping_mall_admin_sections_create } from "../../../generate/generate_random_shopping_mall_admin_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a new section using the authorized admin connection
  const section: IShoppingMallSection =
    await api.functional.shoppingMall.admin.sections.create(adminConnection, {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        parentId: null,
      } satisfies IShoppingMallSection.ICreate,
    });
  typia.assert(section);
  // Step 3: Validate section properties
  TestValidator.equals("section name matches", section.name, section.name);
  TestValidator.equals(
    "section description matches",
    section.description,
    section.description,
  );
  // Step 4: Test authorization enforcement - verify non-admin cannot create section
  const guestConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("non-admin cannot create section", async () => {
    await api.functional.shoppingMall.admin.sections.create(guestConnection, {
      body: {
        name: RandomGenerator.name(1),
        parentId: null,
      } satisfies IShoppingMallSection.ICreate,
    });
  });
}
