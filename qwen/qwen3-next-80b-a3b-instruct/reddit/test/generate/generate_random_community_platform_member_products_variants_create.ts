import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import type { ICommunityPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductVariant";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_product_variant } from "../prepare/prepare_random_community_platform_product_variant";
export async function generate_random_community_platform_member_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductVariant.ICreate> | undefined;
    params: {
      productCode: string;
    };
  },
): Promise<ICommunityPlatformProductVariant> {
  const prepared: ICommunityPlatformProductVariant.ICreate =
    prepare_random_community_platform_product_variant(props.body);
  return await api.functional.communityPlatform.member.products.variants.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
    },
  );
}
