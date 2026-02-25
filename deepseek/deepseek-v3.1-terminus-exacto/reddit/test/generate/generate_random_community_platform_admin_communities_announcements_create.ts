import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityAnnouncement } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityAnnouncement";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_announcement } from "../prepare/prepare_random_community_platform_community_announcement";

export async function generate_random_community_platform_admin_communities_announcements_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunityAnnouncement.ICreate>;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunityAnnouncement> {
  const prepared: ICommunityPlatformCommunityAnnouncement.ICreate =
    prepare_random_community_platform_community_announcement(props.body);
  const result: ICommunityPlatformCommunityAnnouncement =
    await api.functional.communityPlatform.admin.communities.announcements.create(
      connection,
      {
        communityId: props.params.communityId,
        body: prepared,
      },
    );
  return result;
}
