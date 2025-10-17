import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postRedditCommunityMemberCommunitiesCommunityIdPosts(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityPosts.ICreate;
}): Promise<IRedditCommunityPosts> {
  const { member, communityId, body } = props;

  if (communityId !== body.reddit_community_community_id) {
    throw new HttpException(
      "CommunityId in path must match body.reddit_community_community_id",
      400,
    );
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.reddit_community_posts.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      author_member_id: member.id,
      author_guest_id: null,
      reddit_community_community_id: communityId,
      post_type: body.post_type,
      title: body.title,
      body_text: body.body_text ?? null,
      link_url: body.link_url ?? null,
      image_url: body.image_url ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      status: null,
      business_status: null,
    },
  });

  return {
    id: created.id,
    author_member_id: created.author_member_id ?? null,
    author_guest_id: null,
    reddit_community_community_id: created.reddit_community_community_id,
    post_type: created.post_type,
    title: created.title,
    body_text: created.body_text ?? null,
    link_url: created.link_url ?? null,
    image_url: created.image_url ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    status: created.status ?? null,
    business_status: created.business_status ?? null,
  };
}
