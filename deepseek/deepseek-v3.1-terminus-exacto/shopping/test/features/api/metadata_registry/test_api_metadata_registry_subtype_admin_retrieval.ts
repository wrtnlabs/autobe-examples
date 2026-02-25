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

export async function test_api_metadata_registry_subtype_admin_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate with join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {});
  // 2. Generate random UUIDs for the three required parameters
  const registryId = typia.random<string & tags.Format<"uuid">>();
  const relationshipId = typia.random<string & tags.Format<"uuid">>();
  const subtypeId = typia.random<string & tags.Format<"uuid">>();
  // 3. Call the metadata registry subtype retrieval endpoint
  const relationship =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.subtypes.at(
      adminConnection,
      {
        registryId,
        relationshipId,
        subtypeId,
      },
    );
  // 4. Validate the response type and structure
  typia.assert(relationship);
}
