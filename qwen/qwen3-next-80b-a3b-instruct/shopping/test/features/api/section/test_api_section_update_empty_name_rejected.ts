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
export async function test_api_section_update_empty_name_rejected(
  connection: api.IConnection,
): Promise<void> {
  // The scenario requests testing empty/null name updates, but the API's IShoppingMallSection.IUpdate
  // type is defined as {} (empty object), meaning no properties can be updated.
  // This makes the requested test scenario impossible to implement without violating type safety.
  // Per our mandate, we completely rewrite the scenario to what can be implemented:
  // We test that an empty update request (with {}) is accepted, as that's the only valid form.
  // Step 1: Create authenticated superAdmin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Generate a UUID for sectionId (this section may not exist)
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  // Test that empty update is accepted (this is the only valid form per API definition)
  // Since IShoppingMallSection.IUpdate is {}, we must send an empty object
  const updatedSection =
    await api.functional.shoppingMall.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId,
        body: {} satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
}
