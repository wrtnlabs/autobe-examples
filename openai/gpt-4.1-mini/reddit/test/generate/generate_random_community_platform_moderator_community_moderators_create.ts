import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_moderator } from "../prepare/prepare_random_community_platform_community_moderator";

export async function generate_random_community_platform_moderator_community_moderators_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommunityModerator.ICreate>
      | undefined;
  },
): Promise<ICommunityPlatformCommunityModerator> {
  const prepared: ICommunityPlatformCommunityModerator.ICreate =
    prepare_random_community_platform_community_moderator(props.body);
  const result: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.moderator.communityModerators.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
