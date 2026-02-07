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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityMemberPosts(props: {
  member: MemberPayload;
  body: ICommunityPost.ICreate;
}): Promise<ICommunityPost> {
  const community = await MyGlobal.prisma.community_communities.findUnique({
    where: { id: props.member.session_id },
  });
  if (!community) throw new HttpException("Target community not found", 404);
  const subscription = await MyGlobal.prisma.community_subscriptions.findUnique(
    {
      where: {
        community_member_id_community_community_id: {
          community_member_id: props.member.id,
          community_community_id: community.id,
        },
      },
    },
  );
  if (!subscription)
    throw new HttpException("You are not subscribed to this community", 403);
  const created = await MyGlobal.prisma.community_posts.create({
    data: await CommunityPostCollector.collect({
      body: props.body,
      communityMembers: props.member,
      communityMemberSessions: props.member,
    }),
    select: {
      id: true,
      title: true,
      content_type: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      community_member_id: true,
      community_id: true,
      community_post_status_id: true,
    },
  });
  const result: ICommunityPost = {
    id: created.id,
    title: created.title,
    content_type: created.content_type,
    author: {
      id: created.community_member_id,
      display_name: "",
      is_email_verified: false,
      created_at: created.community_member_id
        ? toISOStringSafe(new Date())
        : null,
    },
    community: {
      id: created.community_id,
      name: community.name || "",
      description: community.description || "",
      icon_url: community.icon_url || "",
      created_at: community.created_at
        ? toISOStringSafe(community.created_at)
        : null,
    },
    status: created.community_post_status_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
  return result;
}
