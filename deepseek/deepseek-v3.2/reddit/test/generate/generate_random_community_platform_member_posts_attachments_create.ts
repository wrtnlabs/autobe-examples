import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_community_platform_post_attachment } from "../prepare/prepare_random_community_platform_post_attachment";

export async function generate_random_community_platform_member_posts_attachments_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformPostAttachment.ICreate> | undefined;
    params: {
      postId: string;
    };
  },
): Promise<ICommunityPlatformPostAttachment> {
  const prepared: ICommunityPlatformPostAttachment.ICreate =
    prepare_random_community_platform_post_attachment(props.body);
  const result: ICommunityPlatformPostAttachment =
    await api.functional.communityPlatform.member.posts.attachments.create(
      connection,
      {
        body: prepared,
        postId: props.params.postId,
      },
    );
  return result;
}
