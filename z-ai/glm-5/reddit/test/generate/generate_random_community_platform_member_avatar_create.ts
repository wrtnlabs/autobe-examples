import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAvatarFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAvatarFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_avatar_file } from "../prepare/prepare_random_community_platform_avatar_file";

export async function generate_random_community_platform_member_avatar_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformAvatarFile.ICreate>;
  },
): Promise<ICommunityPlatformMember> {
  const prepared: ICommunityPlatformAvatarFile.ICreate =
    prepare_random_community_platform_avatar_file(props.body);
  const result: ICommunityPlatformMember =
    await api.functional.communityPlatform.member.avatar.create(connection, {
      body: prepared,
    });
  return result;
}
