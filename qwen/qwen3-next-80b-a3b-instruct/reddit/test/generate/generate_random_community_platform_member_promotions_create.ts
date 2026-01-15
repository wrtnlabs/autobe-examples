import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformPromotion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPromotion";
import { prepare_random_community_platform_promotion } from "../prepare/prepare_random_community_platform_promotion";
export async function generate_random_community_platform_member_promotions_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPromotion.ICreate> | undefined;
  },
): Promise<ICommunityPlatformPromotion> {
  const prepared: ICommunityPlatformPromotion.ICreate =
    prepare_random_community_platform_promotion(props.body);
  return await api.functional.communityPlatform.member.promotions.create(
    connection,
    {
      body: prepared,
    },
  );
}
