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

export async function postEconDiscussAdminTopics(props: {
  admin: AdminPayload;
  body: IEconDiscussTopic.ICreate;
}): Promise<IEconDiscussTopic> {
  const { admin, body } = props;

  // Authorization: ensure the caller has an active admin assignment
  const adminRow = await MyGlobal.prisma.econ_discuss_admins.findFirst({
    where: {
      user_id: admin.id,
      deleted_at: null,
      user: {
        is: {
          deleted_at: null,
        },
      },
    },
  });
  if (!adminRow) throw new HttpException("Forbidden", 403);

  const now = toISOStringSafe(new Date());
  const id = v4() as string & tags.Format<"uuid">;

  try {
    const created = await MyGlobal.prisma.econ_discuss_topics.create({
      data: {
        id,
        code: body.code,
        name: body.name,
        description: body.description ?? null,
        created_at: now,
        updated_at: now,
      },
    });

    return {
      id: created.id as string & tags.Format<"uuid">,
      code: created.code,
      name: created.name,
      description: created.description ?? undefined,
      created_at: now,
      updated_at: now,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      // Unique constraint failed (likely on code)
      throw new HttpException("Conflict: Topic code already exists", 409);
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
