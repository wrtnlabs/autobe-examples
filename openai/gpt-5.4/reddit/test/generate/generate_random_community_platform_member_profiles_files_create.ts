import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_profile_file } from "../prepare/prepare_random_community_platform_profile_file";

export async function generate_random_community_platform_member_profiles_files_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformProfileFile.ICreate> | undefined;
  },
): Promise<ICommunityPlatformProfileFile> {
  const prepared: ICommunityPlatformProfileFile.ICreate =
    prepare_random_community_platform_profile_file(props.body);
  const result: ICommunityPlatformProfileFile =
    await api.functional.communityPlatform.member.profiles.files.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
