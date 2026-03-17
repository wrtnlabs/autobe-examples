import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformTempUpload } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformTempUpload";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_temp_upload } from "../prepare/prepare_random_community_platform_temp_upload";

export async function generate_random_community_platform_admin_files_upload(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformTempUpload.ICreate>;
  },
): Promise<ICommunityPlatformTempUpload> {
  const prepared: ICommunityPlatformTempUpload.ICreate =
    prepare_random_community_platform_temp_upload(props.body);
  const result: ICommunityPlatformTempUpload =
    await api.functional.communityPlatform.admin.files.upload(connection, {
      body: prepared,
    });
  return result;
}
