import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUserProfile";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function getEconDiscussMemberMe(props: {
  member: MemberPayload;
}): Promise<IEconDiscussUserProfile> {
  const { member } = props;

  try {
    const user = await MyGlobal.prisma.econ_discuss_users.findFirstOrThrow({
      where: { id: member.id, deleted_at: null },
      select: {
        id: true,
        display_name: true,
        avatar_uri: true,
        timezone: true,
        locale: true,
        email_verified: true,
        created_at: true,
        updated_at: true,
      },
    });

    const [profile, verified, badge, reputation] = await Promise.all([
      MyGlobal.prisma.econ_discuss_user_profiles.findFirst({
        where: { user_id: member.id, deleted_at: null },
        select: { bio: true, affiliation: true, website: true, location: true },
      }),
      MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
        where: { user_id: member.id, deleted_at: null },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_expert_domain_badges.findFirst({
        where: { user_id: member.id, deleted_at: null },
        select: { id: true },
      }),
      MyGlobal.prisma.econ_discuss_user_reputations.findFirst({
        where: { user_id: member.id, deleted_at: null },
        select: { score: true },
      }),
    ]);

    const result: IEconDiscussUserProfile = {
      id: user.id as string & tags.Format<"uuid">,
      displayName: user.display_name,
      avatarUri:
        user.avatar_uri === null
          ? null
          : (user.avatar_uri as string & tags.Format<"uri">),
      timezone: user.timezone ?? undefined,
      locale: user.locale ?? undefined,
      emailVerified: user.email_verified,
      bio: profile?.bio ?? undefined,
      affiliation: profile?.affiliation ?? undefined,
      website:
        profile?.website === undefined
          ? undefined
          : profile.website === null
            ? null
            : (profile.website as string & tags.Format<"uri">),
      location: profile?.location ?? undefined,
      isExpertVerified: verified !== null || badge !== null ? true : undefined,
      reputation: reputation
        ? (Number(reputation.score) as number &
            tags.Type<"int32"> &
            tags.Minimum<0>)
        : undefined,
      createdAt: toISOStringSafe(user.created_at),
      updatedAt: toISOStringSafe(user.updated_at),
    };

    return result;
  } catch (_e) {
    throw new HttpException("Forbidden: Account not accessible", 403);
  }
}
