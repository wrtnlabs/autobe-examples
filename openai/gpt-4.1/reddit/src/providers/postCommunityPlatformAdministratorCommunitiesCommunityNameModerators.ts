import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postCommunityPlatformAdministratorCommunitiesCommunityNameModerators(props: {
  administrator: AdministratorPayload;
  communityName: string;
  body: ICommunityPlatformModerator.ICreate;
}): Promise<ICommunityPlatformModerator> {
  // Step 1: Ensure email is not in use
  const existingModerator =
    await MyGlobal.prisma.community_platform_moderators.findUnique({
      where: { email: props.body.email },
    });
  if (existingModerator) {
    throw new HttpException("Moderator email already exists.", 409);
  }

  // Step 2: Securely hash password
  const password_hash = await PasswordUtil.hash(props.body.password);

  // Step 3: Get current time as ISO string (never use native Date in model/types)
  const now = toISOStringSafe(new Date());

  // Step 4: Insert moderator record
  const created = await MyGlobal.prisma.community_platform_moderators.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash,
      status: props.body.status,
      business_status: props.body.business_status ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Step 5: Return API DTO (never return password_hash)
  return {
    id: created.id,
    email: created.email,
    status: created.status,
    business_status: created.business_status ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at != null
        ? toISOStringSafe(created.deleted_at)
        : undefined,
  };
}
