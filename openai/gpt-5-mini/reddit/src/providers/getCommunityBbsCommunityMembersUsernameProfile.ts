import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";
import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";

export async function getCommunityBbsCommunityMembersUsernameProfile(props: {
  username: string;
}): Promise<ICommunityBbsProfile> {
  const { username } = props;

  try {
    const member =
      await MyGlobal.prisma.community_bbs_communitymember.findFirst({
        where: {
          username,
          status: { not: "deleted_soft" },
          deleted_at: null,
        },
      });

    if (!member) throw new HttpException("Not Found", 404);

    const profile = await MyGlobal.prisma.community_bbs_profiles.findFirst({
      where: {
        community_bbs_communitymember_id: member.id,
        deleted_at: null,
      },
    });

    if (!profile) throw new HttpException("Not Found", 404);

    return {
      id: profile.id as string & tags.Format<"uuid">,
      member: {
        id: member.id as string & tags.Format<"uuid">,
        username: member.username,
        display_name: member.display_name ?? null,
        karma: Number(member.karma) as number & tags.Type<"int32">,
        created_at: toISOStringSafe(member.created_at),
        updated_at: toISOStringSafe(member.updated_at),
      },
      display_name: profile.display_name ?? null,
      bio: profile.bio ?? null,
      avatar_uri: profile.avatar_uri ?? null,
      created_at: toISOStringSafe(profile.created_at),
      updated_at: toISOStringSafe(profile.updated_at),
      deleted_at: profile.deleted_at
        ? toISOStringSafe(profile.deleted_at)
        : null,
    };
  } catch (err) {
    if (err instanceof HttpException) throw err;
    throw new HttpException("Internal Server Error", 500);
  }
}
