import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_text } from "../prepare/prepare_random_community_platform_post_text";

export async function generate_random_community_platform_member_posts_texts_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostText.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostText> {
  const prepared: ICommunityPlatformPostText.ICreate =
    prepare_random_community_platform_post_text(props.body);
  const result: ICommunityPlatformPostText =
    await api.functional.communityPlatform.member.posts.texts.create(
      connection,
      {
        postId: props.params.postId,
        body: prepared,
      },
    );
  return result;
}
