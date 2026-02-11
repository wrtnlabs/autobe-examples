import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPostCollector } from "../collectors/CommunityPostCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPostTransformer } from "../transformers/CommunityPostTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberCommunitiesCommunityIdPosts(props: {
  member: MemberPayload;
  communityId: string;
  body: ICommunityPost.ICreate;
}): Promise<ICommunityPost> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.communityId, deleted_at: null },
  });
  if (!community) throw new HttpException("Community not found", 404);
  const collectResult = await CommunityPostCollector.collect({
    body: props.body,
    communityCommunities: community,
    communityMembers: props.member,
  });
  const created = await MyGlobal.prisma.community_posts.create({
    data: {
      ...collectResult,
      community: collectResult.community,
      author: collectResult.author,
    },
  });
  return await CommunityPostTransformer.transform(created);
}
