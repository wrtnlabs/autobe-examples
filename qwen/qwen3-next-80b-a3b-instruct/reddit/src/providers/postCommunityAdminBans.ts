import { ICommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBannedUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityBannedUserTransformer } from "../transformers/CommunityBannedUserTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAdminBans(props: {
  admin: AdminPayload;
  body: ICommunityBannedUser.ICreate;
}): Promise<ICommunityBannedUser> {
  // Access framework-injected path parameters via type assertion
  const typedProps = props as any;
  // Validate that admin is not banning themselves
  if (props.admin.id === typedProps.bannedUserId) {
    throw new HttpException("Cannot ban yourself", 400);
  }
  // Check for existing active ban
  const existingBan = await MyGlobal.prisma.community_bans.findFirst({
    where: {
      community_id: typedProps.communityId,
      banned_user_id: typedProps.bannedUserId,
      deleted_at: null,
    },
  });
  if (existingBan) {
    throw new HttpException("User is already banned from this community", 409);
  }
  // Create the ban record
  const created = await MyGlobal.prisma.community_bans.create({
    data: {
      id: v4(),
      community: { connect: { id: typedProps.communityId } },
      bannedUser: { connect: { id: typedProps.bannedUserId } },
      bannedBy: { connect: { id: props.admin.id } },
      reason: "Banned by administrator", // Explicit reason as required by schema
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // Transform the result using transformer
  return CommunityBannedUserTransformer.transform(created);
}
