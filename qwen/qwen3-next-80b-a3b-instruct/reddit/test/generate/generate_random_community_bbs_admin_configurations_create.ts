import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityBbsConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsConfiguration";
import type { IJSONValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IJSONValue";
import { prepare_random_community_bbs_configuration } from "../prepare/prepare_random_community_bbs_configuration";
export async function generate_random_community_bbs_admin_configurations_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityBbsConfiguration.ICreate>;
  },
): Promise<ICommunityBbsConfiguration> {
  const prepared: ICommunityBbsConfiguration.ICreate =
    prepare_random_community_bbs_configuration(props.body);
  return await api.functional.communityBbs.admin.configurations.create(
    connection,
    {
      body: prepared,
    },
  );
}
