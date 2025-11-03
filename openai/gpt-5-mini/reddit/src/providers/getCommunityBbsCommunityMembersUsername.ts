import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityMember";
import { ICommunityBbsProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsProfile";

export async function getCommunityBbsCommunityMembersUsername(props: {
  username: string;
}): Promise<ICommunityBbsCommunityMember> {
  const { username } = props;

  try {
    const member =
      await MyGlobal.prisma.community_bbs_communitymember.findFirstOrThrow({
        where: { username, deleted_at: null },
        include: { community_bbs_profiles: true },
      });

    return {
      id: member.id as string & tags.Format<"uuid">,
      username: member.username,
      display_name:
        member.display_name === null ? null : (member.display_name ?? null),
      karma: Number(member.karma),
      email_verified: member.email_verified ?? false,
      status: member.status as
        | "registered_unverified"
        | "registered_verified"
        | "suspended"
        | "banned"
        | "deleted_soft",
      last_login_at: member.last_login_at
        ? toISOStringSafe(member.last_login_at)
        : null,
      created_at: toISOStringSafe(member.created_at),
      updated_at: toISOStringSafe(member.updated_at),
      deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
      profile: member.community_bbs_profiles
        ? {
            id: member.community_bbs_profiles.id as string &
              tags.Format<"uuid">,
            member: {
              id: member.id as string & tags.Format<"uuid">,
              username: member.username,
              display_name:
                member.display_name === null
                  ? null
                  : (member.display_name ?? null),
              karma: Number(member.karma),
              created_at: toISOStringSafe(member.created_at),
              updated_at: toISOStringSafe(member.updated_at),
            },
            display_name:
              member.community_bbs_profiles.display_name === null
                ? null
                : (member.community_bbs_profiles.display_name ?? null),
            bio:
              member.community_bbs_profiles.bio === null
                ? null
                : (member.community_bbs_profiles.bio ?? null),
            avatar_uri:
              member.community_bbs_profiles.avatar_uri === null
                ? null
                : (member.community_bbs_profiles.avatar_uri ?? null),
            created_at: toISOStringSafe(
              member.community_bbs_profiles.created_at,
            ),
            updated_at: toISOStringSafe(
              member.community_bbs_profiles.updated_at,
            ),
            deleted_at: member.community_bbs_profiles.deleted_at
              ? toISOStringSafe(member.community_bbs_profiles.deleted_at)
              : null,
          }
        : undefined,
    };
  } catch (err) {
    // Prisma throws when no record found; normalize to 404
    if (err instanceof Error) {
      // If Prisma-specific error codes are available we could inspect them,
      // but for safety map not-found to 404 and other errors to 500.
      // If the thrown error originates from Prisma client for missing record,
      // treat as 404.
      throw new HttpException("Not Found", 404);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
