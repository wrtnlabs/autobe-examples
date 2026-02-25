import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_feature_flag } from "../prepare/prepare_random_community_platform_feature_flag";

export async function generate_random_community_platform_admin_feature_flags_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFeatureFlag.ICreate>;
  },
): Promise<ICommunityPlatformFeatureFlag> {
  const prepared: ICommunityPlatformFeatureFlag.ICreate =
    prepare_random_community_platform_feature_flag(props.body);
  const result: ICommunityPlatformFeatureFlag =
    await api.functional.communityPlatform.admin.feature_flags.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
