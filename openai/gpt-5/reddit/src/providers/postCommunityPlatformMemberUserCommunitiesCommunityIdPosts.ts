import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IECommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostType";
import { IECommunityPlatformPostVisibilityState } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommunityPlatformPostVisibilityState";
import { MemberuserPayload } from "../decorators/payload/MemberuserPayload";

export async function postCommunityPlatformMemberUserCommunitiesCommunityIdPosts(props: {
  memberUser: MemberuserPayload;
  communityId: string & tags.Format<"uuid">;
  body: ICommunityPlatformPost.ICreate;
}): Promise<ICommunityPlatformPost> {
  const { memberUser, communityId, body } = props;

  // Authorization checks: user exists, verified, active, not soft-deleted
  const user = await MyGlobal.prisma.community_platform_users.findFirst({
    where: {
      id: memberUser.id,
      deleted_at: null,
    },
  });
  if (!user)
    throw new HttpException("Unauthorized: Member not found or deleted", 403);
  if (user.email_verified !== true)
    throw new HttpException("Forbidden: Email not verified", 403);
  if (user.account_state !== "Active")
    throw new HttpException(
      "Forbidden: Account state does not allow posting",
      403,
    );

  // Community existence and soft-delete check
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirst({
      where: { id: communityId, deleted_at: null },
    });
  if (!community)
    throw new HttpException("Not Found: Community does not exist", 404);

  // Prepare timestamps and identifiers
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  // Map content fields based on discriminator
  let contentBody: string | null = null;
  let linkUrl: (string & tags.Format<"uri">) | null = null;
  let imageUrl: (string & tags.Format<"uri">) | null = null;
  switch (body.type) {
    case "TEXT": {
      contentBody = body.body;
      break;
    }
    case "LINK": {
      linkUrl = body.link_url;
      break;
    }
    case "IMAGE": {
      imageUrl = body.image_url;
      break;
    }
    default: {
      throw new HttpException("Bad Request: Invalid post type", 400);
    }
  }

  // Labels with defaults
  const nsfw =
    "nsfw" in body && body.nsfw !== undefined ? body.nsfw! : community.nsfw;
  const spoiler =
    "spoiler" in body && body.spoiler !== undefined ? body.spoiler! : false;

  // Create the post record
  await MyGlobal.prisma.community_platform_posts.create({
    data: {
      id,
      community_platform_user_id: memberUser.id,
      community_platform_community_id: communityId,
      title: body.title,
      type: body.type,
      body: contentBody,
      link_url: linkUrl,
      image_url: imageUrl,
      nsfw,
      spoiler,
      visibility_state: null,
      locked_at: null,
      archived_at: null,
      edited_at: null,
      edit_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Return DTO using prepared values
  return {
    id: id,
    community_platform_user_id: memberUser.id,
    community_platform_community_id: communityId,
    title: body.title,
    type: body.type,
    body: contentBody,
    link_url: linkUrl,
    image_url: imageUrl,
    nsfw,
    spoiler,
    visibility_state: null,
    locked_at: null,
    archived_at: null,
    edited_at: null,
    edit_count: 0 as number & tags.Type<"int32">,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };
}
