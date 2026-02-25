import { IEcommerceMetadataRegistryRelationship } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMetadataRegistryRelationship";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_metadata_registry_relationship(
  input?:
    | DeepPartial<IEcommerceMetadataRegistryRelationship.ICreate>
    | undefined,
): IEcommerceMetadataRegistryRelationship.ICreate {
  return {
    action_type:
      input?.action_type ??
      RandomGenerator.pick([
        "user_suspension",
        "seller_approval",
        "content_moderation",
        "refund_processing",
        "account_verification",
      ] as const),
    general_description:
      input?.general_description ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    super_administrator_id:
      input?.super_administrator_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
