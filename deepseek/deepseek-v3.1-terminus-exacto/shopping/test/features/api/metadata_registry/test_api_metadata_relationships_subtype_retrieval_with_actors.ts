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

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_metadata_relationships_subtype_retrieval_with_actors(
  connection: api.IConnection,
): Promise<void> {
  // Create authenticated super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceSuperAdministrator.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // Retrieve subtype relationship details
  const subtypeRelationship =
    await api.functional.ecommerce.superAdministrator.metadata_registries.relationships.subtypes.at(
      superAdminConnection,
      {
        registryId: typia.random<string & tags.Format<"uuid">>(),
        relationshipId: typia.random<string & tags.Format<"uuid">>(),
        subtypeId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(subtypeRelationship);
  // Validate actor relationships exist (business logic)
  TestValidator.predicate(
    "at least one actor relationship exists",
    subtypeRelationship.administrator !== null ||
      subtypeRelationship.super_administrator !== null,
  );
}
