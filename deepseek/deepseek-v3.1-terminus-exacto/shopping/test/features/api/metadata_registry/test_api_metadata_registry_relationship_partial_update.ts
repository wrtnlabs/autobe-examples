import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAuditLog";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceDbMigration } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceDbMigration";
import type { IEcommerceMetadataRegistry } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistry";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import type { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_metadata_registries_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_create";
import { generate_random_ecommerce_administrator_metadata_registries_relationships_create } from "../../../generate/generate_random_ecommerce_administrator_metadata_registries_relationships_create";
import { prepare_random_ecommerce_metadata_registry } from "../../../prepare/prepare_random_ecommerce_metadata_registry";
import { prepare_random_ecommerce_metadata_registry_relationship } from "../../../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function test_api_metadata_registry_relationship_partial_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // 2. Create metadata registry using utility function
  const registry =
    await generate_random_ecommerce_administrator_metadata_registries_create(
      adminConnection,
      {},
    );
  typia.assert(registry);
  // 3. Create initial relationship using utility function with correct DTO fields
  const initialRelationship =
    await generate_random_ecommerce_administrator_metadata_registries_relationships_create(
      adminConnection,
      {
        params: { registryId: registry.id },
        body: {
          action_type: RandomGenerator.pick([
            "CREATE",
            "UPDATE",
            "DELETE",
          ] as const),
          general_description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(initialRelationship);
  // 4. Store original values for comparison
  const originalActionType = initialRelationship.action_type;
  const originalCreatedAt = new Date(initialRelationship.created_at);
  // 5. Partial update - only general_description (matching actual IUpdate interface)
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedRelationship =
    await api.functional.ecommerce.administrator.metadata_registries.relationships.update(
      adminConnection,
      {
        registryId: registry.id,
        relationshipId: initialRelationship.id,
        body: {
          // Using DeepPartial to allow partial updates
        } satisfies DeepPartial<IEcommerceMetadataRegistryRelationship.IUpdate>,
      },
    );
  typia.assert(updatedRelationship);
  // 6. Validate partial update results
  TestValidator.equals(
    "relationship ID unchanged",
    updatedRelationship.id,
    initialRelationship.id,
  );
  TestValidator.equals(
    "action_type preserved",
    updatedRelationship.action_type,
    originalActionType,
  );
  TestValidator.equals(
    "general_description updated",
    updatedRelationship.general_description,
    updatedDescription,
  );
  // 7. Validate timestamp updates
  const updatedCreatedAt = new Date(updatedRelationship.created_at);
  const updatedUpdatedAt = new Date(updatedRelationship.updated_at);
  TestValidator.equals(
    "created_at unchanged",
    updatedCreatedAt.getTime(),
    originalCreatedAt.getTime(),
  );
  TestValidator.predicate(
    "updated_at is newer than created_at",
    updatedUpdatedAt > updatedCreatedAt,
  );
}