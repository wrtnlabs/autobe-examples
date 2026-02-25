import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformApiRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformApiRateLimit";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_api_rate_limit } from "../prepare/prepare_random_community_platform_api_rate_limit";

export async function generate_random_community_platform_admin_api_rate_limits_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformApiRateLimit.ICreate>;
  },
): Promise<ICommunityPlatformApiRateLimit> {
  const prepared: ICommunityPlatformApiRateLimit.ICreate =
    prepare_random_community_platform_api_rate_limit(props.body);
  const result: ICommunityPlatformApiRateLimit =
    await api.functional.communityPlatform.admin.api_rate_limits.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
