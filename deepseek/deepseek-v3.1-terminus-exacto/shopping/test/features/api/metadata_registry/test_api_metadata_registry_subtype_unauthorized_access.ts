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

export async function test_api_metadata_registry_subtype_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // First create an administrator to establish context
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123" as string & tags.Format<"password">,
    },
  });
  typia.assert(admin);
  // Test unauthorized access using base connection without admin credentials
  await TestValidator.httpError(
    "should return 403 for unauthorized access",
    403,
    async () => {
      await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.at(
        connection,
        {
          registryId: typia.random<string & tags.Format<"uuid">>(),
          relationshipId: typia.random<string & tags.Format<"uuid">>(),
          subtypeId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
