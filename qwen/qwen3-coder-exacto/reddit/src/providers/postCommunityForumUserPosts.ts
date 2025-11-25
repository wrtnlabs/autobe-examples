import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityPost";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserPosts(props: {
  user: UserPayload;
  body: ICommunityForumCommunityPost.ICreate;
}): Promise<ICommunityForumCommunityPost> {
  // Validate community exists and user can access it
  const community =
    await MyGlobal.prisma.community_forum_communities.findUnique({
      where: {
        id: props.body.community_forum_community_id,
        deleted_at: null,
      },
    });

  if (!community) {
    throw new HttpException("Community not found", 404);
  }

  // Check if user is a member of the community (has active membership)
  const membership =
    await MyGlobal.prisma.community_forum_community_memberships.findFirst({
      where: {
        community_id: props.body.community_forum_community_id,
        user_id: props.user.id,
        status: "active",
        deleted_at: null,
      },
    });

  if (!membership) {
    throw new HttpException(
      "You must be a member of this community to post",
      403,
    );
  }

  // Create the post
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_forum_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      community_forum_community_id: props.body.community_forum_community_id,
      community_forum_user_id: props.user.id,
      community_forum_user_session_id: props.user.session_id,
      title: props.body.title,
      type: props.body.type,
      body: props.body.body ?? null,
      url: props.body.url ?? null,
      image_uri: props.body.image_uri ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return the created post with proper null/undefined handling per DTO interface
  return {
    id: created.id,
    community_forum_community_id: created.community_forum_community_id,
    community_forum_user_id: created.community_forum_user_id,
    community_forum_user_session_id: created.community_forum_user_session_id,
    title: created.title,
    type: typia.assert<"link" | "text" | "image">(created.type),
    body: created.body ?? undefined, // Optional field - use undefined when null
    url: created.url ?? undefined, // Optional field - use undefined when null
    image_uri: created.image_uri ?? undefined, // Optional field - use undefined when null
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined, // Optional field
  };
}
