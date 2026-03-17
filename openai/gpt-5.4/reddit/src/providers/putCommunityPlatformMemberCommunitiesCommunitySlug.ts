import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityTransformer } from "../transformers/CommunityPlatformCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformMemberCommunitiesCommunitySlug(props: {
  member: MemberPayload;
  communitySlug: string & tags.Format<"uuid">;
  body: ICommunityPlatformCommunity.IUpdate;
}): Promise<ICommunityPlatformCommunity> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { slug: props.communitySlug },
      select: {
        id: true,
        community_platform_member_id: true,
        status: true,
        deleted_at: true,
      },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community is not in an updatable state", 400);
  }
  if (community.status !== "active") {
    throw new HttpException("Community is not in an updatable state", 400);
  }
  if (community.community_platform_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const updatedAt: string & tags.Format<"date-time"> = typia.random<
    string & tags.Format<"date-time">
  >();
  try {
    await MyGlobal.prisma.$transaction([
      MyGlobal.prisma.community_platform_communities.update({
        where: { id: community.id },
        data: {
          ...(props.body.title !== undefined && { title: props.body.title }),
          ...(props.body.description !== undefined && {
            description: props.body.description,
          }),
          updated_at: updatedAt,
        },
      }),
    ]);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Conflict", 409);
    }
    throw error;
  }
  const updated =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { id: community.id },
      ...CommunityPlatformCommunityTransformer.select(),
    });
  return await CommunityPlatformCommunityTransformer.transform(updated);
}
