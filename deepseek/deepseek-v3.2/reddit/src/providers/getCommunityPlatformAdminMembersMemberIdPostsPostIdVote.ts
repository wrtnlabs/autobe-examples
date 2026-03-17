import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformPostVoteTransformer } from "../transformers/CommunityPlatformPostVoteTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getCommunityPlatformAdminMembersMemberIdPostsPostIdVote(props: {
  admin: AdminPayload;
  memberId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<ICommunityPlatformPostVote> {
  const vote =
    await MyGlobal.prisma.community_platform_post_votes.findUniqueOrThrow({
      where: {
        community_platform_member_id_community_platform_post_id: {
          community_platform_member_id: props.memberId,
          community_platform_post_id: props.postId,
        },
        deleted_at: null,
      },
      ...CommunityPlatformPostVoteTransformer.select(),
    });
  return await CommunityPlatformPostVoteTransformer.transform(vote);
}
