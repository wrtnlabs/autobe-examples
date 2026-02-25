import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_metadata_registry_relationship } from "../prepare/prepare_random_ecommerce_metadata_registry_relationship";

export async function generate_random_ecommerce_administrator_administrative_actions_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEcommerceMetadataRegistryRelationship.ICreate>
      | undefined;
  },
): Promise<IEcommerceMetadataRegistryRelationship> {
  const prepared: IEcommerceMetadataRegistryRelationship.ICreate =
    prepare_random_ecommerce_metadata_registry_relationship(props.body);
  const result: IEcommerceMetadataRegistryRelationship =
    await api.functional.ecommerce.administrator.administrative_actions.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
