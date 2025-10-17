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

export async function putEconPoliticalForumAdministratorCategoriesCategoryId(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumCategory.IUpdate;
}): Promise<IEconPoliticalForumCategory> {
  const { administrator, categoryId, body } = props;

  // Authorization: ensure caller is enrolled administrator
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });
  if (!admin)
    throw new HttpException("Unauthorized: Not an enrolled administrator", 403);

  // Ensure category exists and is active (deleted_at null means active)
  const existing =
    await MyGlobal.prisma.econ_political_forum_categories.findUnique({
      where: { id: categoryId },
    });
  if (!existing || existing.deleted_at !== null)
    throw new HttpException("Not Found", 404);

  // Uniqueness checks
  if (body.slug !== undefined && body.slug !== existing.slug) {
    const conflict =
      await MyGlobal.prisma.econ_political_forum_categories.findFirst({
        where: { slug: body.slug, deleted_at: null },
      });
    if (conflict) throw new HttpException("Conflict: slug already exists", 409);
  }

  if (
    body.code !== undefined &&
    body.code !== null &&
    body.code !== existing.code
  ) {
    const conflictCode =
      await MyGlobal.prisma.econ_political_forum_categories.findFirst({
        where: { code: body.code, deleted_at: null },
      });
    if (conflictCode)
      throw new HttpException("Conflict: code already exists", 409);
  }

  // Prepare timestamp once
  const now = toISOStringSafe(new Date());

  try {
    const updated =
      await MyGlobal.prisma.econ_political_forum_categories.update({
        where: { id: categoryId },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(body.slug !== undefined && { slug: body.slug }),
          ...(body.code !== undefined && { code: body.code }),
          ...(body.description !== undefined && {
            description: body.description,
          }),
          ...(body.is_moderated !== undefined && {
            is_moderated: body.is_moderated,
          }),
          ...(body.requires_verification !== undefined && {
            requires_verification: body.requires_verification,
          }),
          ...(body.order !== undefined && { order: body.order }),
          updated_at: now,
        },
      });

    return {
      id: updated.id as string & tags.Format<"uuid">,
      code: updated.code === null ? null : updated.code,
      name: updated.name,
      slug: updated.slug,
      description: updated.description === null ? null : updated.description,
      is_moderated: updated.is_moderated,
      requires_verification: updated.requires_verification,
      order: updated.order,
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at: updated.deleted_at
        ? toISOStringSafe(updated.deleted_at)
        : null,
    };
  } catch (err) {
    // Prisma unique constraint may surface as an error; map to 409 if possible
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002: Unique constraint failed
      if ((err as any).code === "P2002") {
        throw new HttpException("Conflict: Unique constraint violation", 409);
      }
    }
    throw new HttpException("Internal Server Error", 500);
  }
}
