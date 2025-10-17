import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postCommunityPlatformMemberCommunities(props: {
  member: MemberPayload;
  body: ICommunityPlatformCommunity.ICreate;
}): Promise<ICommunityPlatformCommunity> {
  const now = toISOStringSafe(new Date());
  try {
    const created = await MyGlobal.prisma.community_platform_communities.create(
      {
        data: {
          id: v4(),
          creator_member_id: props.member.id,
          name: props.body.name,
          title: props.body.title,
          description: props.body.description ?? null,
          slug: props.body.slug,
          status: "active",
          created_at: now,
          updated_at: now,
        },
      },
    );
    return {
      id: created.id,
      creator_member_id: created.creator_member_id,
      name: created.name,
      title: created.title,
      description: created.description ?? null,
      slug: created.slug,
      status: created.status,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : undefined,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpException("Community name or slug already exists.", 409);
    }
    throw new HttpException("Failed to create community.", 500);
  }
}
