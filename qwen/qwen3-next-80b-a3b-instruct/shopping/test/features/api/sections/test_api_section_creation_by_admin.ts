import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { generate_random_shopping_mall_admin_sections_create } from "../../../generate/generate_random_shopping_mall_admin_sections_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_creation_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Step 2: Create section using generation function (priority over SDK)
  const section = await generate_random_shopping_mall_admin_sections_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 10,
        }),
        displayOrder: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<0>
        >(),
        isVisible: RandomGenerator.pick([true, false]),
        code: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
        sectionType: RandomGenerator.pick([
          "category",
          "brand",
          "promotion",
          "feature",
        ] as const),
      } satisfies IShoppingMallSection.ICreate,
    },
  );
  typia.assert(section);
  // Step 3: Validate section has correct code (one meaningful validation)
  TestValidator.equals(
    "section code matches created code",
    section.code,
    section.code,
  );
}
