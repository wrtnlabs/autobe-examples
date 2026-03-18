import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_user_profile } from "../prepare/prepare_random_community_platform_user_profile";

export async function generate_random_community_platform_member_profiles_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformUserProfile.ICreate> | undefined;
  },
): Promise<ICommunityPlatformUserProfile> {
  const prepared: ICommunityPlatformUserProfile.ICreate =
    prepare_random_community_platform_user_profile(props.body);
  return await api.functional.communityPlatform.member.profiles.create(
    connection,
    {
      body: prepared,
    },
  );
}
