import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IEcommerceMetadataRegistryRelationshipOfVariantConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationshipOfVariantConfig";
export function prepare_random_ecommerce_metadata_registry_relationship_of_variant_config(input?: DeepPartial<IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate> | undefined): IEcommerceMetadataRegistryRelationshipOfVariantConfig.ICreate {
    return {
        user_type: input?.user_type ?? RandomGenerator.pick(['customer', 'seller', 'administrator'] as const),
        ban_reason: input?.ban_reason ?? RandomGenerator.paragraph({ sentences: 2 }),
        ban_duration_days: input?.ban_duration_days ?? RandomGenerator.pick([null, typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>()]),
        appeal_status: input?.appeal_status ?? RandomGenerator.pick(['none', 'pending', 'approved', 'rejected'] as const),
        appeal_reason: input?.appeal_reason ?? RandomGenerator.pick([null, RandomGenerator.paragraph({ sentences: 1 })])
    };
}