import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMetadataRegistryRelationship";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_ecommerce_administrator_administrative_actions_create } from "../../../generate/generate_random_ecommerce_administrator_administrative_actions_create";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

/**
 * Test the administrator attribution filtering specifically for administrative actions.
 * 1. Authenticate as a regular administrator and create administrative actions
 * 2. Authenticate as a super administrator and create administrative actions
 * 3. Search for actions attributed to the regular administrator
 * 4. Search for actions attributed to the super administrator
 * 5. Validate that filtered results accurately reflect attribution criteria
 */
export async function test_api_administrative_actions_administrator_attribution(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connections
  const adminConnection: api.IConnection = { host: connection.host };
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 1. Create and authenticate regular administrator
  const adminUser = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password_123",
    },
  });
  typia.assert(adminUser);
  // 2. Create and authenticate super administrator
  const superAdminUser = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "super_password_123",
        href: "https://test.example.com",
        referrer: "https://referrer.example.com",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  typia.assert(superAdminUser);
  // 3. Create administrative actions for regular administrator
  const adminActions = await ArrayUtil.asyncRepeat(3, async (index) => {
    const action =
      await generate_random_ecommerce_administrator_administrative_actions_create(
        adminConnection,
        {
          body: {
            action_type: `admin_action_${index}`,
            general_description: `Administrative action ${index} performed by regular administrator`,
          },
        },
      );
    typia.assert(action);
    return action;
  });
  // 4. Create administrative actions for super administrator
  const superAdminActions = await ArrayUtil.asyncRepeat(2, async (index) => {
    const action =
      await generate_random_ecommerce_administrator_administrative_actions_create(
        superAdminConnection,
        {
          body: {
            action_type: `super_action_${index}`,
            general_description: `Administrative action ${index} performed by super administrator`,
            super_administrator_id: superAdminUser.id,
          },
        },
      );
    typia.assert(action);
    return action;
  });
  // 5. Search for actions attributed to regular administrator
  const adminFiltered =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      adminConnection,
      {
        body: {
          userType: "administrator" as const,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(adminFiltered);
  // 6. Search for actions attributed to super administrator
  const superAdminFiltered =
    await api.functional.ecommerce.administrator.administrative_actions.index(
      superAdminConnection,
      {
        body: {
          userType: "superAdministrator" as const,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMetadataRegistryRelationship.IRequest,
      },
    );
  typia.assert(superAdminFiltered);
  // 7. Validate administrator attribution filtering
  TestValidator.equals(
    "administrator filtered results should contain admin actions",
    adminFiltered.data.length > 0,
    true,
  );
  TestValidator.equals(
    "super administrator filtered results should contain super admin actions",
    superAdminFiltered.data.length > 0,
    true,
  );
  // 8. Verify attribution information in responses
  adminFiltered.data.forEach((action) => {
    TestValidator.predicate(
      "admin actions should have administrator attribution",
      action.administrator !== null,
    );
    if (action.administrator) {
      TestValidator.equals(
        "admin attribution should match created administrator",
        action.administrator.id,
        adminUser.id,
      );
    }
  });
  superAdminFiltered.data.forEach((action) => {
    TestValidator.predicate(
      "super admin actions should have super administrator attribution",
      action.superAdministrator !== null,
    );
    if (action.superAdministrator) {
      TestValidator.equals(
        "super admin attribution should match created super administrator",
        action.superAdministrator.id,
        superAdminUser.id,
      );
    }
  });
  // 9. Test cross-check: admin results should not contain super admin actions
  const allAdminActions = adminFiltered.data.map((action) => action.id);
  const allSuperAdminActions = superAdminFiltered.data.map(
    (action) => action.id,
  );
  const hasOverlap = allAdminActions.some((adminId) =>
    allSuperAdminActions.includes(adminId),
  );
  TestValidator.equals(
    "administrator and super administrator actions should not overlap in filtered results",
    hasOverlap,
    false,
  );
}
