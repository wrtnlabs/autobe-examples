import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentSnapshot";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_comment_snapshot } from "../prepare/prepare_random_community_platform_comment_snapshot";

export async function generate_random_community_platform_comment_snapshots_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformCommentSnapshot.ICreate> | undefined;
  },
): Promise<ICommunityPlatformCommentSnapshot> {
  const prepared: ICommunityPlatformCommentSnapshot.ICreate =
    prepare_random_community_platform_comment_snapshot(props.body);
  const result: ICommunityPlatformCommentSnapshot =
    await api.functional.communityPlatform.comment_snapshots.create(
      connection,
      {
        body: prepared,
      },
    );
  return result;
}
