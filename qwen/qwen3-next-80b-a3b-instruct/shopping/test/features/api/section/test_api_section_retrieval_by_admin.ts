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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_section_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Generate a random UUID for sectionId
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the section using the admin connection
  const retrievedSection: IShoppingMallSection =
    await api.functional.shoppingMall.admin.sections.at(adminConnection, {
      sectionId,
    });
  typia.assert(retrievedSection);
  // Step 4: Validate cache by making a second retrieval
  const retrievedSectionAgain: IShoppingMallSection =
    await api.functional.shoppingMall.admin.sections.at(adminConnection, {
      sectionId,
    });
  typia.assert(retrievedSectionAgain);
  // Step 5: Validate that the second retrieval matches the first (cache hit)
  TestValidator.equals(
    "retrieved section matches after second call",
    retrievedSectionAgain,
    retrievedSection,
  );
}
