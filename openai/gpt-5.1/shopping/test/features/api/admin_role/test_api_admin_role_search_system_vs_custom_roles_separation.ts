import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_search_system_vs_custom_roles_separation(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an admin so that subsequent calls are authorized
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuth);

  // 2. Create system and non-system admin roles with distinct codes
  const baseCodePrefix = RandomGenerator.alphaNumeric(8);

  const systemRoleBodies: IShoppingMallAdminRole.ICreate[] = [
    {
      code: `${baseCodePrefix}_sys_1`,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_system: true,
    },
    {
      code: `${baseCodePrefix}_sys_2`,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_system: true,
    },
  ];

  const customRoleBodies: IShoppingMallAdminRole.ICreate[] = [
    {
      code: `${baseCodePrefix}_custom_1`,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_system: false,
    },
    {
      code: `${baseCodePrefix}_custom_2`,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_system: false,
    },
    {
      code: `${baseCodePrefix}_custom_3`,
      name: RandomGenerator.name(),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      is_system: false,
    },
  ];

  const createdSystemRoles: IShoppingMallAdminRole[] = [];
  const createdCustomRoles: IShoppingMallAdminRole[] = [];

  for (const body of systemRoleBodies) {
    const created = await api.functional.shoppingMall.admin.adminRoles.create(
      connection,
      { body },
    );
    typia.assert(created);
    createdSystemRoles.push(created);
  }

  for (const body of customRoleBodies) {
    const created = await api.functional.shoppingMall.admin.adminRoles.create(
      connection,
      { body },
    );
    typia.assert(created);
    createdCustomRoles.push(created);
  }

  const allCreatedRoles: IShoppingMallAdminRole[] = [
    ...createdSystemRoles,
    ...createdCustomRoles,
  ];

  // Pick one system role to later verify immutability of summary fields
  const trackedSystemRole: IShoppingMallAdminRole | undefined =
    createdSystemRoles[0];

  // 3. Query roles with is_system = true
  const systemPage: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_system: true,
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert(systemPage);

  // Verify all returned summaries are system roles
  for (const summary of systemPage.data) {
    TestValidator.predicate(
      "all roles returned by is_system=true must have isSystem=true",
      summary.isSystem === true,
    );
  }

  // Verify that each created system role appears in the is_system=true result set
  for (const role of createdSystemRoles) {
    const found = systemPage.data.find((s) => s.id === role.id);
    TestValidator.predicate(
      "created system role must be present in is_system=true results",
      found !== undefined,
    );
  }

  // 4. Query roles with is_system = false
  const customPage: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_system: false,
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert(customPage);

  for (const summary of customPage.data) {
    TestValidator.predicate(
      "all roles returned by is_system=false must have isSystem=false",
      summary.isSystem === false,
    );
  }

  for (const role of createdCustomRoles) {
    const found = customPage.data.find((s) => s.id === role.id);
    TestValidator.predicate(
      "created custom role must be present in is_system=false results",
      found !== undefined,
    );
  }

  // 5. Query roles without constraining is_system (null)
  const combinedPage: IPageIShoppingMallAdminRole.ISummary =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1,
        limit: 50,
        is_system: null,
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert(combinedPage);

  // Ensure both system and custom roles can appear in the combined result
  const combinedIds = new Set(combinedPage.data.map((s) => s.id));

  let systemCountInCombined = 0;
  let customCountInCombined = 0;

  for (const role of createdSystemRoles) {
    if (combinedIds.has(role.id)) systemCountInCombined++;
  }
  for (const role of createdCustomRoles) {
    if (combinedIds.has(role.id)) customCountInCombined++;
  }

  TestValidator.predicate(
    "combined listing must contain at least one of the created system roles",
    systemCountInCombined > 0,
  );
  TestValidator.predicate(
    "combined listing must contain at least one of the created custom roles",
    customCountInCombined > 0,
  );

  const totalCreatedPresentInCombined =
    systemCountInCombined + customCountInCombined;
  TestValidator.equals(
    "combined listing should include all created roles that appear in individual filters",
    totalCreatedPresentInCombined,
    systemCountInCombined + customCountInCombined,
  );

  // 6. Verify that listing is read-only for summary fields of a tracked system role
  if (trackedSystemRole !== undefined) {
    // Capture expected summary fields from the created role (code, name, is_system, created_at)
    const expectedCode = trackedSystemRole.code;
    const expectedName = trackedSystemRole.name;
    const expectedIsSystem = trackedSystemRole.is_system;
    const expectedCreatedAt = trackedSystemRole.created_at;

    // Re-query system roles and locate the tracked role
    const reloadedSystemPage: IPageIShoppingMallAdminRole.ISummary =
      await api.functional.shoppingMall.admin.adminRoles.index(connection, {
        body: {
          page: 1,
          limit: 50,
          is_system: true,
          code: null,
          name: null,
        } satisfies IShoppingMallAdminRole.IRequest,
      });
    typia.assert(reloadedSystemPage);

    const trackedSummary = reloadedSystemPage.data.find(
      (s) => s.id === trackedSystemRole.id,
    );

    TestValidator.predicate(
      "tracked system role must still be present after repeated listings",
      trackedSummary !== undefined,
    );

    if (trackedSummary !== undefined) {
      TestValidator.equals(
        "role code must remain unchanged after listing operations",
        trackedSummary.code,
        expectedCode,
      );
      TestValidator.equals(
        "role name must remain unchanged after listing operations",
        trackedSummary.name,
        expectedName,
      );
      TestValidator.equals(
        "role isSystem flag must remain unchanged after listing operations",
        trackedSummary.isSystem,
        expectedIsSystem,
      );
      TestValidator.equals(
        "role createdAt must remain unchanged after listing operations",
        trackedSummary.createdAt,
        expectedCreatedAt,
      );
    }
  }
}
