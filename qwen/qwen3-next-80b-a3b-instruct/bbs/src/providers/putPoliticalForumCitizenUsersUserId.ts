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

export async function putPoliticalForumCitizenUsersUserId(props: {
  citizen: CitizenPayload;
  userId: string & tags.Format<"uuid">;
  body: IPoliticalForumCitizen.IUpdate;
}): Promise<IPoliticalForumCitizen> {
  // Verify authenticated citizen matches target user
  if (props.citizen.id !== props.userId) {
    throw new HttpException(
      "Forbidden: Cannot update another user's profile",
      403,
    );
  }

  let updateData: Partial<IPoliticalForumCitizen>;

  try {
    // Parse the body string as JSON since IUpdate is defined as string
    updateData = JSON.parse(props.body) as Partial<IPoliticalForumCitizen>;
  } catch (e) {
    throw new HttpException("Invalid JSON in update body", 400);
  }

  // Validate required fields in update data
  if (updateData.email && !updateData.email.includes("@")) {
    throw new HttpException("Invalid email format", 400);
  }

  // Update the citizen record in database
  const updated = await MyGlobal.prisma.political_forum_citizens.update({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    data: {
      email: updateData.email,
      display_name: updateData.display_name,
      updated_at: toISOStringSafe(new Date()),
      deleted_at: updateData.deleted_at,
      email_verified: updateData.email_verified,
    },
  });

  // Return the updated record with proper date formatting
  return {
    id: updated.id,
    email: updated.email,
    display_name:
      updated.display_name !== null ? updated.display_name : undefined,
    created_at: updated.created_at
      ? toISOStringSafe(updated.created_at)
      : undefined,
    updated_at: updated.updated_at
      ? toISOStringSafe(updated.updated_at)
      : undefined,
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    email_verified: updated.email_verified,
  };
}
