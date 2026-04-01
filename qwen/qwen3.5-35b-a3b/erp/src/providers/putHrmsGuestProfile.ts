import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMemberProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMemberProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { GuestPayload } from "../decorators/payload/GuestPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsGuestProfile(props: {
  guest: GuestPayload;
  body: IHrmsMemberProfile.IUpdate;
}): Promise<IHrmsMemberProfile> {
  // Validate at least one field is provided
  if (
    props.body.displayName === undefined &&
    props.body.phone === undefined &&
    props.body.avatarId === undefined
  ) {
    throw new HttpException("At least one field must be provided", 400);
  }
  // Verify the guest exists and session is valid
  const guestRecord = await MyGlobal.prisma.hrms_guests.findFirst({
    where: {
      id: props.guest.id,
      deleted_at: null,
    },
    select: {
      id: true,
      deleted_at: true,
    },
  });
  if (guestRecord === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const sessionRecord = await MyGlobal.prisma.hrms_guest_sessions.findFirst({
    where: {
      id: props.guest.session_id,
      hrms_guest_id: props.guest.id,
      expired_at: { gt: new Date() },
    },
  });
  if (sessionRecord === null) {
    throw new HttpException("Session expired", 403);
  }
  // Resolve avatar_uri if avatarId is provided
  let avatarUri: string | null = null;
  if (props.body.avatarId !== undefined) {
    if (props.body.avatarId === null) {
      avatarUri = null;
    } else {
      const avatarFile = await MyGlobal.prisma.hrms_files.findFirst({
        where: {
          id: props.body.avatarId,
          owner_id: props.guest.id,
          owner_type: "guest",
        },
      });
      if (avatarFile === null) {
        throw new HttpException("Avatar file not found", 404);
      }
      avatarUri = avatarFile.storage_path;
    }
  }
  // Execute transaction to update profile
  const updatedRecord = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.hrms_members.update({
      where: {
        id: props.guest.id,
        deleted_at: null,
      },
      data: {
        ...(props.body.displayName !== undefined && {
          display_name: props.body.displayName,
        }),
        ...(props.body.phone !== undefined && {
          phone_number: props.body.phone,
        }),
        ...(props.body.avatarId !== undefined && {
          avatar_uri: avatarUri,
        }),
        updated_at: new Date(),
      },
    });
    return updated;
  });
  // Fetch the updated profile with avatar_uri
  const profileRecord = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: {
      id: updatedRecord.id,
    },
    select: {
      id: true,
      email: true,
      display_name: true,
      avatar_uri: true,
      phone_number: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Transform and return
  const result: IHrmsMemberProfile = {
    id: updatedRecord.id,
    email: profileRecord.email,
    display_name: profileRecord.display_name,
    avatar_uri: profileRecord.avatar_uri,
    phone_number: profileRecord.phone_number,
    created_at: toISOStringSafe(profileRecord.created_at),
    updated_at: toISOStringSafe(profileRecord.updated_at),
    deleted_at: profileRecord.deleted_at
      ? toISOStringSafe(profileRecord.deleted_at)
      : null,
  };
  return result;
}
