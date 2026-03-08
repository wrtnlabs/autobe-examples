import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformFileVersion } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFileVersion";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_file } from "../prepare/prepare_random_community_platform_file";

export async function generate_random_community_platform_member_avatar_update_avatar(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformFile.ICreate>;
  },
): Promise<ICommunityPlatformFile> {
  const prepared: ICommunityPlatformFile.ICreate =
    prepare_random_community_platform_file(props.body);
  const result: ICommunityPlatformFile =
    await api.functional.communityPlatform.member.avatar.updateAvatar(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
