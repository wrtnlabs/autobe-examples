import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMetadatum } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMetadatum";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_metadatum } from "../prepare/prepare_random_community_platform_metadatum";

export async function generate_random_community_admin_platform_metadata_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformMetadatum.ICreate> | undefined;
  },
): Promise<ICommunityPlatformMetadatum> {
  const prepared: ICommunityPlatformMetadatum.ICreate =
    prepare_random_community_platform_metadatum(props.body);
  return await api.functional.community.admin.platform_metadata.create(
    connection,
    {
      body: prepared,
    },
  );
}
