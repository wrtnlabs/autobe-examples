import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_metadata_registry_relationship_of_variant_config } from "../prepare/prepare_random_ecommerce_metadata_registry_relationship_of_variant_config";

export async function generate_random_ecommerce_administrator_admin_user_bans_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate>;
  },
): Promise<IEcommerceMetadataRegistryRelationshipOfVariantConfig> {
  const prepared: IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate =
    prepare_random_ecommerce_metadata_registry_relationship_of_variant_config(
      props.body,
    );
  const result: IEcommerceMetadataRegistryRelationshipOfVariantConfig =
    await api.functional.ecommerce.administrator.admin_user_bans.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
