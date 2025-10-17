import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalVote";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberPostsPostIdVotes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPortalVote.ICreate;
}): Promise<ICommunityPortalVote> {
  const { member, postId, body } = props;

  // Authorization: verify member record is active
  const memberRecord = await MyGlobal.prisma.community_portal_members.findFirst(
    {
      where: {
        user_id: member.id,
        is_email_verified: true,
        is_suspended: false,
      },
    },
  );
  if (!memberRecord)
    throw new HttpException("Forbidden: member not active or suspended", 403);

  // Body value extraction and validation
  const valueCandidate = body as unknown as { value?: unknown };
  if (
    valueCandidate.value === undefined ||
    (valueCandidate.value !== 1 && valueCandidate.value !== -1)
  ) {
    throw new HttpException("Bad Request: value must be 1 or -1", 400);
  }
  const value = valueCandidate.value as 1 | -1;

  // Verify post exists and check visibility
  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
    include: { community: true },
  });
  if (!post || post.deleted_at !== null)
    throw new HttpException("Not Found", 404);

  if (post.community && post.community.is_private === true) {
    const subscription =
      await MyGlobal.prisma.community_portal_subscriptions.findFirst({
        where: {
          community_id: post.community.id,
          user_id: member.id,
          deleted_at: null,
        },
      });
    if (!subscription)
      throw new HttpException("Forbidden: community is private", 403);
  }

  // Enforce one active vote per (user,post)
  const existing = await MyGlobal.prisma.community_portal_votes.findFirst({
    where: {
      user_id: member.id,
      post_id: postId,
      deleted_at: null,
    },
  });

  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  try {
    if (!existing) {
      const created = await MyGlobal.prisma.community_portal_votes.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          user_id: member.id,
          post_id: postId,
          comment_id: null,
          value,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

      return {
        id: created.id as string & tags.Format<"uuid">,
        user_id: created.user_id as string & tags.Format<"uuid">,
        post_id: created.post_id as string & tags.Format<"uuid">,
        comment_id: null,
        value: created.value as 1 | -1,
        created_at: toISOStringSafe(created.created_at) as string &
          tags.Format<"date-time">,
        updated_at: toISOStringSafe(created.updated_at) as string &
          tags.Format<"date-time">,
        deleted_at: created.deleted_at
          ? (toISOStringSafe(created.deleted_at) as string &
              tags.Format<"date-time">)
          : null,
      };
    }

    if (existing.value === value) {
      throw new HttpException("Conflict: identical active vote exists", 409);
    }

    const updated = await MyGlobal.prisma.community_portal_votes.update({
      where: { id: existing.id },
      data: { value, updated_at: now },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      user_id: updated.user_id as string & tags.Format<"uuid">,
      post_id: updated.post_id as string & tags.Format<"uuid">,
      comment_id: null,
      value: updated.value as 1 | -1,
      created_at: toISOStringSafe(updated.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(updated.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: updated.deleted_at
        ? (toISOStringSafe(updated.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Conflict: duplicate vote", 409);
    }
    throw err;
  }
}
