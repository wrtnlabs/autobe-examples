import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductSpecification";
import { prepare_random_community_platform_product_specification } from "../prepare/prepare_random_community_platform_product_specification";
export async function generate_random_community_platform_admin_products_specifications_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformProductSpecification.ICreate>
      | undefined;
    params: {
      productCode: string;
    };
  },
): Promise<ICommunityPlatformProductSpecification> {
  const prepared: ICommunityPlatformProductSpecification.ICreate =
    prepare_random_community_platform_product_specification(props.body);
  return await api.functional.communityPlatform.admin.products.specifications.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
    },
  );
}
