import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumCategory";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function postEconPoliticalForumAdministratorCategories(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumCategory.ICreate;
}): Promise<IEconPoliticalForumCategory> {
  const { administrator, body } = props;

  // Authorization: verify administrator enrollment
  const adminRecord =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });

  if (adminRecord === null) {
    throw new HttpException("Unauthorized: administrator not enrolled", 403);
  }

  const now = toISOStringSafe(new Date());

  try {
    const created =
      await MyGlobal.prisma.econ_political_forum_categories.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          code: body.code ?? null,
          name: body.name,
          slug: body.slug,
          description: body.description ?? null,
          is_moderated: body.is_moderated,
          requires_verification: body.requires_verification,
          order: body.order,
          created_at: now,
          updated_at: now,
          deleted_at: null,
        },
      });

    return {
      id: created.id as string & tags.Format<"uuid">,
      code: created.code ?? null,
      name: created.name,
      slug: created.slug,
      description: created.description ?? null,
      is_moderated: created.is_moderated,
      requires_verification: created.requires_verification,
      order: created.order,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at: created.deleted_at
        ? toISOStringSafe(created.deleted_at)
        : null,
    };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      const meta = err.meta as { target?: string[] } | undefined;
      const target = meta?.target?.[0];
      if (target === "slug" || String(target).includes("slug"))
        throw new HttpException("Conflict: slug already exists", 409);
      if (target === "code" || String(target).includes("code"))
        throw new HttpException("Conflict: code already exists", 409);
      throw new HttpException("Conflict: Unique constraint violation", 409);
    }

    throw new HttpException("Internal Server Error", 500);
  }
}
