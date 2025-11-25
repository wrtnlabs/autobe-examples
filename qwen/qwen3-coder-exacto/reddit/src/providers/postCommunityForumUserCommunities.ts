import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityForumCommunityGroup } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityGroup";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postCommunityForumUserCommunities(props: {
  user: UserPayload;
  body: ICommunityForumCommunityGroup.ICreate;
}): Promise<ICommunityForumCommunityGroup> {
  // Check for existing community with same name or slug
  const existing = await MyGlobal.prisma.community_forum_communities.findFirst({
    where: {
      OR: [{ name: props.body.name }, { slug: props.body.slug }],
      deleted_at: null,
    },
  });

  if (existing) {
    throw new HttpException(
      "Community with this name or slug already exists",
      409,
    );
  }

  // Create the new community
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.community_forum_communities.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      name: props.body.name,
      slug: props.body.slug,
      title: props.body.title,
      description: props.body.description,
      rules: props.body.rules,
      privacy_level: props.body.privacy_level,
      status: props.body.status,
      member_count: 0,
      post_count: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      created_by_id: props.user.id,
      updated_by_id: props.user.id,
    },
  });

  return {
    id: created.id,
    name: created.name,
    slug: created.slug,
    title: created.title,
    description: created.description,
    rules: created.rules,
    privacy_level: typia.assert<"public" | "private" | "restricted">(
      created.privacy_level,
    ),
    status: typia.assert<"active" | "inactive" | "archived">(created.status),
    member_count: created.member_count,
    post_count: created.post_count,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    created_by_id: created.created_by_id,
    updated_by_id: created.updated_by_id
      ? (created.updated_by_id as string & tags.Format<"uuid">)
      : undefined,
  };
}
