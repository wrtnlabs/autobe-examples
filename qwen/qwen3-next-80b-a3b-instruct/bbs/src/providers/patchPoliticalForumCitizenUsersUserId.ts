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

export async function patchPoliticalForumCitizenUsersUserId(props: {
  citizen: CitizenPayload;
  userId: string & tags.Format<"uuid">;
  body: IPoliticalForumCitizen.IUpdate;
}): Promise<IPoliticalForumCitizen> {
  // Verify ownership: authenticated citizen must match target userId
  if (props.citizen.id !== props.userId) {
    throw new HttpException("Forbidden", 403);
  }

  // Parse the string body as JSON - trust that it's already validated by the controller layer
  // according to the absolute prohibition on runtime type checking
  const updateData = JSON.parse(props.body);

  // Update the citizen record with inline parameters
  const updated = await MyGlobal.prisma.political_forum_citizens.update({
    where: {
      id: props.userId,
      deleted_at: null,
    },
    data: {
      ...updateData,
      updated_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });

  if (!updated) {
    throw new HttpException("Citizen not found", 404);
  }

  // Return complete citizen record with proper type conversion
  // Follow exact interface definition:
  // id: string & tags.Format<"uuid">;
  // email: string & tags.Format<"email">;
  // display_name?: string | undefined;
  // created_at?: (string & tags.Format<"date-time">) | undefined;
  // updated_at?: (string & tags.Format<"date-time">) | undefined;
  // deleted_at?: (string & tags.Format<"date-time">) | undefined;
  // email_verified?: boolean | undefined;

  return {
    id: updated.id,
    email: updated.email,
    display_name:
      updated.display_name === null ? undefined : updated.display_name,
    created_at: updated.created_at
      ? toISOStringSafe(updated.created_at)
      : undefined,
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
    email_verified: updated.email_verified,
  };
}
