import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_metadata_registry_relationship_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator (but not used for main request)
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://test.com",
      referrer: "https://referrer.test.com",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // 2. Create and authenticate as regular administrator (will be used for unauthorized attempt)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  await authorize_administrator_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 3. Log in as regular administrator for fresh session
  const regularAdminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_login(regularAdminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IEcommerceAdministrator.ILogin,
  });
  // 4. Attempt to access super administrator endpoint with insufficient permissions
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const relationshipId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "regular admin cannot access super admin endpoint",
    async () => {
      await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.at(
        regularAdminConnection,
        {
          registryId,
          relationshipId,
        },
      );
    },
  );
}
