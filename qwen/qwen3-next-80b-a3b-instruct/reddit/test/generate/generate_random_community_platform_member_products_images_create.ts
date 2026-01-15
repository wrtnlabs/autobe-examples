import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductImage";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductImage";
import { prepare_random_community_platform_product_image } from "../prepare/prepare_random_community_platform_product_image";
export async function generate_random_community_platform_member_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProductImage.ICreate> | undefined;
    params: {
      productCode: string;
    };
  },
): Promise<IPageICommunityPlatformProductImage> {
  const prepared: ICommunityPlatformProductImage.ICreate =
    prepare_random_community_platform_product_image(props.body);
  return await api.functional.communityPlatform.member.products.images.create(
    connection,
    {
      body: prepared,
      productCode: props.params.productCode,
    },
  );
}
