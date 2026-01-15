import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import type { ICommunityPlatformConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfigurationValue";
import { prepare_random_community_platform_configuration } from "../prepare/prepare_random_community_platform_configuration";
export async function generate_random_community_platform_admin_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformConfiguration.ICreate> | undefined;
  },
): Promise<ICommunityPlatformConfiguration> {
  const prepared: ICommunityPlatformConfiguration.ICreate =
    prepare_random_community_platform_configuration(props.body);
  return await api.functional.communityPlatform.admin.configurations.create(
    connection,
    {
      body: prepared,
    },
  );
}
