import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPoliticalForumCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumCitizen";
import { CitizenPayload } from "../decorators/payload/CitizenPayload";

export async function getPoliticalForumCitizenUsersUserId(props: {
  citizen: CitizenPayload;
  userId: string & tags.Format<"uuid">;
}): Promise<IPoliticalForumCitizen.IPublic> {
  const citizen = await MyGlobal.prisma.political_forum_citizens.findUnique({
    where: {
      id: props.userId,
      deleted_at: null,
    },
  });

  if (!citizen) {
    throw new HttpException("Citizen not found", 404);
  }

  return {
    id: citizen.id,
    display_name: citizen.display_name ?? "",
    username: "",
    bio: undefined,
    email: undefined,
    registration_status: "active",
    profile_image_url: undefined,
    join_date: toISOStringSafe(new Date()),
    last_login_at: undefined,
    account_type: "citizen",
    location: undefined,
    verified_badge: false,
    article_count: 0,
    comment_count: 0,
    report_count: 0,
    reported_count: 0,
    moderation_action_count: 0,
    recognition_level: 0,
  };
}
