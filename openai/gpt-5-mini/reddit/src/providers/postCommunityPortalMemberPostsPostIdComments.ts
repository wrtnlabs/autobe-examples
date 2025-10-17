import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPortalComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPortalComment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPortalMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: ICommunityPortalComment.ICreate;
}): Promise<ICommunityPortalComment> {
  const { member, postId, body } = props;

  // Defensive check: the DTO does not include author_user_id; if a malicious
  // client somehow sent it, reject to prevent spoofing.
  // Use 'in' operator instead of hasOwnProperty to comply with coding rules.
  if ("author_user_id" in (body as unknown as Record<string, unknown>)) {
    throw new HttpException(
      "Bad Request: author_user_id must not be supplied by client",
      400,
    );
  }

  // Fetch the post along with its community for visibility checks
  const post = await MyGlobal.prisma.community_portal_posts.findUnique({
    where: { id: postId },
    include: { community: true },
  });
  if (!post) throw new HttpException("Not Found: post not found", 404);

  // If the community is private, ensure the member has access via one of:
  // - community creator
  // - active subscription
  // - active moderator assignment
  if (post.community && post.community.is_private) {
    const isCreator = post.community.creator_user_id === member.id;
    const [subscription, moderator] = await Promise.all([
      MyGlobal.prisma.community_portal_subscriptions.findFirst({
        where: {
          community_id: post.community_id,
          user_id: member.id,
          deleted_at: null,
        },
      }),
      MyGlobal.prisma.community_portal_moderators.findFirst({
        where: {
          community_id: post.community_id,
          user_id: member.id,
          is_active: true,
        },
      }),
    ]);

    if (!isCreator && !subscription && !moderator) {
      throw new HttpException(
        "Forbidden: access to private community denied",
        403,
      );
    }
  }

  // Validate parent comment when provided
  if (body.parent_comment_id !== undefined && body.parent_comment_id !== null) {
    const parent = await MyGlobal.prisma.community_portal_comments.findUnique({
      where: { id: body.parent_comment_id },
    });
    if (!parent)
      throw new HttpException("Bad Request: parent_comment_id not found", 400);
    if (parent.post_id !== postId)
      throw new HttpException(
        "Bad Request: parent_comment_id does not belong to the same post",
        400,
      );

    // Enforce maximum nesting depth (3)
    const MAX_DEPTH = 3;
    let depth = 1;
    // parent is non-null here due to the guard above; create a non-null reference
    const parentNonNull = parent as NonNullable<typeof parent>;
    let cursor: NonNullable<typeof parent> | null = parentNonNull;
    while (cursor && cursor.parent_comment_id) {
      depth += 1;
      if (depth >= MAX_DEPTH)
        throw new HttpException(
          "Bad Request: maximum comment nesting depth exceeded",
          400,
        );
      // capture parent id before await to preserve narrowing
      const parentId = cursor.parent_comment_id as string;
      cursor = await MyGlobal.prisma.community_portal_comments.findUnique({
        where: { id: parentId },
      });
    }
  }

  // Prepare values (use provided helper to convert Date -> string)
  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  // Create the comment
  const created = await MyGlobal.prisma.community_portal_comments.create({
    data: {
      id,
      post_id: postId,
      parent_comment_id: body.parent_comment_id ?? null,
      author_user_id: member.id,
      body: body.body,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    post_id: created.post_id as string & tags.Format<"uuid">,
    parent_comment_id: created.parent_comment_id ?? null,
    author_user_id: created.author_user_id ?? null,
    body: created.body,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
