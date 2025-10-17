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

export async function putEconDiscussMemberMeProfile(props: {
  member: MemberPayload;
  body: IEconDiscussUserProfile.IUpdate;
}): Promise<IEconDiscussUserProfile> {
  const { member, body } = props;

  // Verify base user exists and is active (not soft-deleted)
  const baseUser = await MyGlobal.prisma.econ_discuss_users.findFirst({
    where: {
      id: member.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!baseUser) throw new HttpException("Not Found", 404);

  const now = toISOStringSafe(new Date());

  // Update core identity/preferences on users
  await MyGlobal.prisma.econ_discuss_users.update({
    where: { id: member.id },
    data: {
      display_name: body.displayName ?? undefined,
      avatar_uri: body.avatarUri ?? undefined,
      timezone: body.timezone ?? undefined,
      locale: body.locale ?? undefined,
      updated_at: now,
    },
  });

  // Extended profile handling
  const existingProfileAny =
    await MyGlobal.prisma.econ_discuss_user_profiles.findFirst({
      where: { user_id: member.id },
      select: { id: true, deleted_at: true },
    });

  if (existingProfileAny && existingProfileAny.deleted_at !== null) {
    throw new HttpException("Conflict: Profile is inactive", 409);
  }

  if (existingProfileAny) {
    await MyGlobal.prisma.econ_discuss_user_profiles.update({
      where: { id: existingProfileAny.id },
      data: {
        bio: body.bio ?? undefined,
        affiliation: body.affiliation ?? undefined,
        website: body.website ?? undefined,
        location: body.location ?? undefined,
        updated_at: now,
      },
    });
  } else {
    await MyGlobal.prisma.econ_discuss_user_profiles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        user_id: member.id,
        bio: body.bio ?? null,
        affiliation: body.affiliation ?? null,
        website: body.website ?? null,
        location: body.location ?? null,
        created_at: now,
        updated_at: now,
      },
    });
  }

  // Refresh consolidated view
  const [userRow, profileRow, expertRow, badgeRow] = await Promise.all([
    MyGlobal.prisma.econ_discuss_users.findUniqueOrThrow({
      where: { id: member.id },
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
    }),
    MyGlobal.prisma.econ_discuss_user_profiles.findFirst({
      where: { user_id: member.id, deleted_at: null },
      select: {
        bio: true,
        affiliation: true,
        website: true,
        location: true,
      },
    }),
    MyGlobal.prisma.econ_discuss_verified_experts.findFirst({
      where: { user_id: member.id, deleted_at: null },
      select: { id: true },
    }),
    MyGlobal.prisma.econ_discuss_expert_domain_badges.findFirst({
      where: { user_id: member.id, deleted_at: null },
      select: { id: true },
    }),
  ]);

  const isExpert = Boolean(expertRow || badgeRow);

  return {
    id: member.id,
    displayName: userRow.display_name,
    avatarUri: userRow.avatar_uri ?? null,
    timezone: userRow.timezone ?? null,
    locale: userRow.locale ?? null,
    emailVerified: userRow.email_verified,
    bio: profileRow?.bio ?? null,
    affiliation: profileRow?.affiliation ?? null,
    website: profileRow?.website ?? null,
    location: profileRow?.location ?? null,
    isExpertVerified: isExpert,
    createdAt: toISOStringSafe(userRow.created_at),
    updatedAt: toISOStringSafe(userRow.updated_at),
  };
}
