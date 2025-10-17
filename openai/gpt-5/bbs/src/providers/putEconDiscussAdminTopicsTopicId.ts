import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconDiscussTopic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussTopic";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putEconDiscussAdminTopicsTopicId(props: {
  admin: AdminPayload;
  topicId: string & tags.Format<"uuid">;
  body: IEconDiscussTopic.IUpdate;
}): Promise<IEconDiscussTopic> {
  const { admin, topicId, body } = props;

  // Authorization: ensure requester has an active admin assignment
  const adminAssignment = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: admin.id,
      deleted_at: null,
      user: { is: { deleted_at: null } },
    },
    select: { id: true },
  });
  if (!adminAssignment) throw new HttpException("Forbidden", 403);

  // Ensure the topic exists and is active (not soft-deleted)
  const existing = await MyGlobal.prisma.econ_discuss_topics.findFirst({
    where: {
      id: topicId,
      deleted_at: null,
    },
    select: {
      id: true,
      code: true,
      name: true,
      description: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!existing) throw new HttpException("Not Found", 404);

  const now = toISOStringSafe(new Date());

  try {
    const updated = await MyGlobal.prisma.econ_discuss_topics.update({
      where: { id: topicId },
      data: {
        name: body.name ?? undefined,
        description: body.description ?? undefined,
        updated_at: now,
      },
    });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      code: updated.code,
      name: updated.name,
      description: updated.description ?? undefined,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: now,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        throw new HttpException("Conflict", 409);
      }
      if (err.code === "P2025") {
        throw new HttpException("Not Found", 404);
      }
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
