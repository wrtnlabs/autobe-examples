import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformSaleCurrencyRate } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSaleCurrencyRate";
import { prepare_random_community_platform_sale_currency_rate } from "../prepare/prepare_random_community_platform_sale_currency_rate";
export async function generate_random_community_platform_salescurrencyrates_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformSaleCurrencyRate.ICreate> | undefined;
  },
): Promise<ICommunityPlatformSaleCurrencyRate> {
  const prepared: ICommunityPlatformSaleCurrencyRate.ICreate =
    prepare_random_community_platform_sale_currency_rate(props.body);
  return await api.functional.communityPlatform.salescurrencyrates.create(
    connection,
    {
      body: prepared,
    },
  );
}
