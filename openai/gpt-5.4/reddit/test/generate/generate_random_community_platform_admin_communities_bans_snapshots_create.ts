import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityBanSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBanSnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_ban_snapshot } from "../prepare/prepare_random_community_platform_community_ban_snapshot";

export async function generate_random_community_platform_admin_communities_bans_snapshots_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<ICommunityPlatformCommunityBanSnapshot.ICreate>
      | undefined;
    params: {
      communityId: string;
      banId: string;
    };
  },
): Promise<ICommunityPlatformCommunityBanSnapshot> {
  const prepared: ICommunityPlatformCommunityBanSnapshot.ICreate =
    prepare_random_community_platform_community_ban_snapshot(props.body);
  const result: ICommunityPlatformCommunityBanSnapshot =
    await api.functional.communityPlatform.admin.communities.bans.snapshots.create(
      connection,
      {
        communityId: props.params.communityId,
        banId: props.params.banId,
        body: prepared,
      },
    );
  return result;
}
