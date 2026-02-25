import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMetadataRegistryFieldDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryFieldDefinition";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_metadata_registry_field_definition } from "../prepare/prepare_random_ecommerce_metadata_registry_field_definition";

export async function generate_random_ecommerce_administrator_metadata_registries_field_definitions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMetadataRegistryFieldDefinition.ICreate>;
    params: {
      registryId: string;
    };
  },
): Promise<IEcommerceMetadataRegistryFieldDefinition> {
  const prepared: IEcommerceMetadataRegistryFieldDefinition.ICreate =
    prepare_random_ecommerce_metadata_registry_field_definition(props.body);
  const result: IEcommerceMetadataRegistryFieldDefinition =
    await api.functional.ecommerce.administrator.metadata_registries.field_definitions.create(
      connection,
      {
        registryId: props.params.registryId,
        body: prepared,
      },
    );
  return result;
}
