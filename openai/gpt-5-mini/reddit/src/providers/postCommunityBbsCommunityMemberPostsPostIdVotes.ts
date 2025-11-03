import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPostVote";
import { CommunitymemberPayload } from "../decorators/payload/CommunitymemberPayload";

export async function postCommunityBbsCommunityMemberPostsPostIdVotes(props: {
  communityMember: CommunitymemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityBbsPostVote.ICreate;
}): Promise<ICommunityBbsPostVote> {
  const { communityMember, postId, body } = props;

  if (body.value !== 1 && body.value !== -1) {
    throw new HttpException("Bad Request: vote value must be 1 or -1", 400);
  }

  const post = await MyGlobal.prisma.community_bbs_posts.findUnique({
    where: { id: postId },
  });
  if (!post) throw new HttpException("Not Found: post does not exist", 404);
  if (!post.is_published || post.deleted_at !== null) {
    throw new HttpException("Conflict: post is not publishable", 409);
  }

  const voteKind = body.value === 1 ? "up" : "down";
  const now = toISOStringSafe(new Date());

  const whereComposite = {
    community_bbs_post_id_community_bbs_communitymember_id: {
      community_bbs_post_id: postId,
      community_bbs_communitymember_id: communityMember.id,
    },
  };

  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.community_bbs_post_votes.findUnique({
      where: whereComposite,
    });
    let vote;

    if (existing) {
      if (existing.value === body.value) {
        vote = await tx.community_bbs_post_votes.update({
          where: whereComposite,
          data: {
            updated_at: now,
            ...(body.ip !== undefined
              ? { ip: body.ip === null ? null : body.ip }
              : {}),
            vote_kind: voteKind,
          },
        });

        await tx.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            actor_type: "community_member",
            actor_id: communityMember.id,
            entity: "post",
            action: "vote.upsert",
            payload: JSON.stringify({ postId, value: body.value }),
            ip: body.ip ?? null,
            created_at: now,
            updated_at: now,
          },
        });
      } else {
        const prevUp = existing.value === 1 ? 1 : 0;
        const prevDown = existing.value === -1 ? 1 : 0;
        const newUp = body.value === 1 ? 1 : 0;
        const newDown = body.value === -1 ? 1 : 0;
        const deltaUp = newUp - prevUp;
        const deltaDown = newDown - prevDown;
        const deltaScore = body.value - existing.value;

        vote = await tx.community_bbs_post_votes.update({
          where: whereComposite,
          data: {
            value: body.value,
            vote_kind: voteKind,
            ...(body.ip !== undefined
              ? { ip: body.ip === null ? null : body.ip }
              : {}),
            updated_at: now,
          },
        });

        await tx.community_bbs_posts.update({
          where: { id: postId },
          data: {
            ...(deltaUp !== 0 ? { upvotes: { increment: deltaUp } } : {}),
            ...(deltaDown !== 0 ? { downvotes: { increment: deltaDown } } : {}),
            ...(deltaScore !== 0 ? { score: { increment: deltaScore } } : {}),
          },
        });

        await tx.community_bbs_audit_logs.create({
          data: {
            id: v4() as string & tags.Format<"uuid">,
            actor_type: "community_member",
            actor_id: communityMember.id,
            entity: "post",
            action: "vote.update",
            payload: JSON.stringify({
              postId,
              previous: existing.value,
              value: body.value,
            }),
            ip: body.ip ?? null,
            created_at: now,
            updated_at: now,
          },
        });
      }
    } else {
      vote = await tx.community_bbs_post_votes.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          community_bbs_post_id: postId,
          community_bbs_communitymember_id: communityMember.id,
          value: body.value,
          vote_kind: voteKind,
          ...(body.ip !== undefined
            ? { ip: body.ip === null ? null : body.ip }
            : {}),
          created_at: now,
          updated_at: now,
        },
      });

      await tx.community_bbs_posts.update({
        where: { id: postId },
        data: {
          ...(body.value === 1 ? { upvotes: { increment: 1 } } : {}),
          ...(body.value === -1 ? { downvotes: { increment: 1 } } : {}),
          score: { increment: body.value },
        },
      });

      await tx.community_bbs_audit_logs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          actor_type: "community_member",
          actor_id: communityMember.id,
          entity: "post",
          action: "vote.create",
          payload: JSON.stringify({ postId, value: body.value }),
          ip: body.ip ?? null,
          created_at: now,
          updated_at: now,
        },
      });
    }

    return {
      id: vote.id,
      community_bbs_post_id: vote.community_bbs_post_id,
      community_bbs_communitymember_id: vote.community_bbs_communitymember_id,
      value: vote.value,
      vote_kind: vote.vote_kind,
      ip: undefined,
      created_at: toISOStringSafe(vote.created_at),
      updated_at: toISOStringSafe(vote.updated_at),
      deleted_at: vote.deleted_at ? toISOStringSafe(vote.deleted_at) : null,
    } as ICommunityBbsPostVote;
  });

  return result;
}
