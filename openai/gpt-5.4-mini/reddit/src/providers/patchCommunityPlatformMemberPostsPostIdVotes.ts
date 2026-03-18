import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPlatformVote.IRequest;
}): Promise<ICommunityPlatformVote> {
  const post = await MyGlobal.prisma.community_platform_posts.findUniqueOrThrow(
    {
      where: { id: props.postId },
      select: {
        id: true,
        status: true,
      },
    },
  );
  if (post.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.direction !== null &&
    props.body.direction !== 1 &&
    props.body.direction !== -1
  ) {
    throw new HttpException("Bad Request", 400);
  }
  const existing = await MyGlobal.prisma.community_platform_votes.findFirst({
    where: {
      community_platform_member_id: props.member.id,
      deleted_at: null,
      postTarget: {
        community_platform_post_id: props.postId,
      },
    },
    select: {
      id: true,
      community_platform_member_id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (props.body.direction === null) {
    if (existing === null) {
      throw new HttpException("Not Found", 404);
    }
    await MyGlobal.prisma.$transaction(async (prisma) => {
      await prisma.community_platform_vote_posts.deleteMany({
        where: {
          community_platform_vote_id: existing.id,
        },
      });
      await prisma.community_platform_votes.delete({
        where: {
          id: existing.id,
        },
      });
    });
    throw new HttpException("Not Found", 404);
  }
  const direction = props.body.direction;
  if (existing === null) {
    const created = await MyGlobal.prisma.$transaction(async (prisma) => {
      const vote = await prisma.community_platform_votes.create({
        data: {
          id: v4(),
          community_platform_member_id: props.member.id,
          direction,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
          postTarget: {
            create: {
              id: v4(),
              community_platform_post_id: props.postId,
            },
          },
        },
        select: {
          id: true,
          community_platform_member_id: true,
          direction: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
      return vote;
    });
    return {
      id: created.id,
      communityPlatformMemberId: created.community_platform_member_id,
      member: props.member as unknown as ICommunityPlatformMember,
      direction: created.direction,
      createdAt: toISOStringSafe(created.created_at),
      updatedAt: toISOStringSafe(created.updated_at),
      deletedAt: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  }
  if (existing.direction === direction) {
    return {
      id: existing.id,
      communityPlatformMemberId: existing.community_platform_member_id,
      member: props.member as unknown as ICommunityPlatformMember,
      direction: existing.direction,
      createdAt: toISOStringSafe(existing.created_at),
      updatedAt: toISOStringSafe(existing.updated_at),
      deletedAt: existing.deleted_at
        ? toISOStringSafe(existing.deleted_at)
        : null,
    };
  }
  const updated = await MyGlobal.prisma.community_platform_votes.update({
    where: {
      id: existing.id,
    },
    data: {
      direction,
      updated_at: new Date(),
    },
    select: {
      id: true,
      community_platform_member_id: true,
      direction: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: updated.id,
    communityPlatformMemberId: updated.community_platform_member_id,
    member: props.member as unknown as ICommunityPlatformMember,
    direction: updated.direction,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
