import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_temp_upload } from "../prepare/prepare_random_community_platform_temp_upload";

export async function generate_random_community_platform_member_temp_uploads_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformTempUpload.ICreate> | undefined;
  },
): Promise<ICommunityPlatformTempUpload.ICreate> {
  const prepared: ICommunityPlatformTempUpload.ICreate =
    prepare_random_community_platform_temp_upload(props.body);
  return await api.functional.communityPlatform.member.temp_uploads.create(
    connection,
    {
      body: prepared,
    },
  );
}
