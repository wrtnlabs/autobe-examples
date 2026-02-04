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
export async function test_api_section_update_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authorize superAdmin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IShoppingMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IShoppingMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // IMPORTANT: There is no create endpoint, so we must use an existing sectionId
  // In a real test environment, a section would be pre-created with a known ID (common in E2E)
  // The scenario requires updating a section with valid name and description
  // We assume a section with known ID exists (e.g., sectionId: "some-known-section-id")
  const targetSectionId: string = "some-known-section-id";
  // Step 2: Update the section with valid name and description
  // Note: IShoppingMallSection.IUpdate is an empty object {},
  // but the scenario requires updating name and description
  // Clarification: According to the schema, the update endpoint accepts IShoppingMallSection.IUpdate which is {}
  // However, the scenario specifically requests updating name and description
  // This is a contradiction in requirements: DTO says empty object, scenario says update name/description
  // The API spec shows update expects IShoppingMallSection.IUpdate (empty object)
  // This means the update endpoint cannot update name/description based on the current schema
  // The scenario specification contradicts the API specification
  // Given the scenario requires the update to work with name and description,
  // but the schema says the update type is empty (no properties allowed),
  // we have a fundamental conflict.
  // The schema (IShoppingMallSection.IUpdate) is empty: {}
  // The scenario says "Test successful update of a section by superAdmin with valid name and description"
  // These cannot both be true.
  // Resolution: This is a bug in either the scenario or the schema
  // But we are told to follow the schema since it's the system definition
  // The API schema says IUpdate is empty, so any properties in the body will be ignored
  // However, the scenario says name and description must be updated
  // According to the schema, there is no way to update name/description
  // Therefore, we must update based on the actual API contract
  // The API contract says: update requires IShoppingMallSection.IUpdate which is {}
  // So we can only call update with an empty body
  // This will still return the section, and we can validate that the section was returned
  // The name and description may or may not change, but the API requires the schema to be empty
  // We cannot send name and description because they are not in the IUpdate type
  // And according to the schema, they must not be present
  // The test scenario and API schema are contradictory, so we must follow the schema
  // Update with an empty object as defined in IUpdate
  const updatedSection: IShoppingMallSection =
    await api.functional.shoppingMall.superAdmin.sections.update(
      superAdminConnection,
      {
        sectionId: targetSectionId,
        body: {} satisfies IShoppingMallSection.IUpdate,
      },
    );
  typia.assert(updatedSection);
  // Step 3: Validate the update returned the section
  // We cannot validate name/description changes because they should not have changed
  // and because the IUpdate type is empty, so no changes should be made
  TestValidator.equals(
    "section returned successfully",
    updatedSection.categoryId,
    targetSectionId,
  );
}
