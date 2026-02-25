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

export async function postCommunityMemberCommunitiesCommunityNamePosts(props: {
  member: MemberPayload;
  communityName: string;
  body: ICommunityPost.ICreate;
}): Promise<ICommunityPost> {
  const community =
    await MyGlobal.prisma.community_communities.findFirstOrThrow({
      where: {
        name: { equals: props.communityName, mode: "insensitive" },
        deleted_at: null,
      },
    });
  const subscription = await MyGlobal.prisma.community_subscriptions.findFirst({
    where: {
      community_member_id: props.member.id,
      community_community_id: community.id,
    },
  });
  if (subscription === null) {
    throw new HttpException(
      "You must subscribe to this community to create posts",
      403,
    );
  }
  const ban = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: community.id,
      member_id: props.member.id,
    },
  });
  if (
    ban !== null &&
    (ban.expired_at === null || ban.expired_at > new Date())
  ) {
    throw new HttpException("You are banned from this community", 403);
  }
  const now = new Date();
  const postId = v4();
  const collectedData = await CommunityPostCollector.collect({
    body: props.body,
    communityCommunities: { id: community.id },
    communityMembers: { id: props.member.id },
    communityMemberSessions: { id: props.member.session_id },
  });
  const created = await MyGlobal.prisma.community_posts.create({
    data: {
      ...collectedData,
      id: postId,
      vote_score: 1,
      upvote_count: 1,
      created_at: now,
      updated_at: now,
    },
    ...CommunityPostTransformer.select(),
  });
  await MyGlobal.prisma.community_post_votes.create({
    data: {
      id: v4(),
      community_member_id: props.member.id,
      community_post_id: postId,
      is_upvote: true,
      created_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.community_members.update({
    where: { id: props.member.id },
    data: { karma: { increment: 1 } },
  });
  return CommunityPostTransformer.transform(created);
}
