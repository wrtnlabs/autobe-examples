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
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
export async function test_api_section_retrieval_by_superadmin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  // Step 2: Generate a valid UUID for sectionId
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the section by its ID using super admin connection
  const retrievedSection: IShoppingMallSection =
    await api.functional.shoppingMall.superAdmin.sections.at(
      superAdminConnection,
      { sectionId },
    );
  // Step 4: Validate the retrieved section
  typia.assert(retrievedSection);
  // Validate expected properties
  TestValidator.equals(
    "retrieved section categoryId matches request",
    retrievedSection.categoryId,
    sectionId,
  );
  TestValidator.predicate(
    "retrieved section name is string",
    typeof retrievedSection.name === "string",
  );
  TestValidator.predicate(
    "retrieved section description is string or undefined",
    retrievedSection.description === undefined ||
      typeof retrievedSection.description === "string",
  );
}
