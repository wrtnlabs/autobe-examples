import { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunityModeratorCollector } from "../collectors/CommunityPlatformCommunityModeratorCollector";
import { CommunityPlatformCommunityModeratorTransformer } from "../transformers/CommunityPlatformCommunityModeratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityPlatformCommunityModerators(props: {
  body: ICommunityPlatformCommunityModerator.ICreate;
}): Promise<ICommunityPlatformCommunityModerator> {
  const community =
    await MyGlobal.prisma.community_platform_communities.findFirstOrThrow({
      where: {
        id: props.body.communityId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  void community;
  await MyGlobal.prisma.community_platform_members.findFirstOrThrow({
    where: {
      id: props.body.moderatorUserId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const existing =
    await MyGlobal.prisma.community_platform_community_moderators.findFirst({
      where: {
        community_id: props.body.communityId,
        moderator_user_id: props.body.moderatorUserId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existing) {
    throw new HttpException("Moderator assignment already exists", 409);
  }
  try {
    const created =
      await MyGlobal.prisma.community_platform_community_moderators.create({
        data: await CommunityPlatformCommunityModeratorCollector.collect({
          body: props.body,
        }),
        ...CommunityPlatformCommunityModeratorTransformer.select(),
      });
    return await CommunityPlatformCommunityModeratorTransformer.transform(
      created,
    );
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === "P2002") {
        throw new HttpException("Moderator assignment already exists", 409);
      }
    }
    throw e;
  }
}
