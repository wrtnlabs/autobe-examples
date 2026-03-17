import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_community_snapshot } from "../prepare/prepare_random_community_platform_community_snapshot";

export async function generate_random_community_platform_admin_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommunitySnapshot.ICreate> | undefined;
    params: {
      communityId: string;
    };
  },
): Promise<ICommunityPlatformCommunitySnapshot> {
  const prepared: ICommunityPlatformCommunitySnapshot.ICreate =
    prepare_random_community_platform_community_snapshot(props.body);
  const result: ICommunityPlatformCommunitySnapshot =
    await api.functional.communityPlatform.admin.snapshots.create(connection, {
      communityId: props.params.communityId,
      body: prepared,
    });
  return result;
}
