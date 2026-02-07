import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function putCommunityGuestProfile(props: {
  guest: GuestPayload;
  body: ICommunityMember.IUpdate;
}): Promise<ICommunityMember> {
  const { id } = props.guest;
  // Update only available fields in community_guests schema
  const updatedGuest = await MyGlobal.prisma.community_guests.update({
    where: { id },
    data: {
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      device_fingerprint: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Return empty ICommunityMember object as per schema constraints - no fields can be updated from ICommunityMember.IUpdate
  return {
    id: updatedGuest.id,
    device_fingerprint: updatedGuest.device_fingerprint,
    created_at: updatedGuest.created_at,
    updated_at: updatedGuest.updated_at,
    deleted_at: updatedGuest.deleted_at,
  };
}
