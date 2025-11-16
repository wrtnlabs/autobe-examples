import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModeratorProfile";
import { IPageICommunityPlatformModeratorProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformModeratorProfile";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function patchCommunityPlatformAdministratorModeratorsModeratorIdProfiles(props: {
  administrator: AdministratorPayload;
  moderatorId: string & tags.Format<"uuid">;
  body: ICommunityPlatformModeratorProfile.IRequest;
}): Promise<IPageICommunityPlatformModeratorProfile.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = {
    community_platform_moderator_id: props.moderatorId,
  };
  if (props.body.display_username !== undefined) {
    where.display_username = { contains: props.body.display_username };
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (
    props.body.created_from !== undefined ||
    props.body.created_to !== undefined
  ) {
    where.created_at = {
      ...(props.body.created_from !== undefined
        ? { gte: props.body.created_from }
        : {}),
      ...(props.body.created_to !== undefined
        ? { lte: props.body.created_to }
        : {}),
    };
  }

  const [profiles, total] = await Promise.all([
    MyGlobal.prisma.community_platform_moderator_profiles.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.community_platform_moderator_profiles.count({ where }),
  ]);

  return {
    data: profiles.map((profile) => ({
      id: profile.id,
      moderator: { id: profile.community_platform_moderator_id },
      display_username: profile.display_username,
      avatar_uri: profile.avatar_uri ?? undefined,
      bio: profile.bio ?? undefined,
      status: profile.status,
      created_at: toISOStringSafe(profile.created_at),
      updated_at: toISOStringSafe(profile.updated_at),
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
