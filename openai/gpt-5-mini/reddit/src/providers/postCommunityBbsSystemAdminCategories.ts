import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityBbsCommunityCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityCategory";
import { ICommunityBbsSystemAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSystemAdmin";
import { SystemadminPayload } from "../decorators/payload/SystemadminPayload";

export async function postCommunityBbsSystemAdminCategories(props: {
  systemAdmin: SystemadminPayload;
  body: ICommunityBbsCommunityCategory.ICreate;
}): Promise<ICommunityBbsCommunityCategory> {
  const { systemAdmin, body } = props;

  if (!systemAdmin) throw new HttpException("Unauthorized", 401);

  // Check uniqueness of code (consider only active categories)
  const existing =
    await MyGlobal.prisma.community_bbs_community_categories.findFirst({
      where: { code: body.code, deleted_at: null },
    });
  if (existing)
    throw new HttpException("Conflict: category code already exists", 409);

  // Resolve parent_code to parent_id (if provided)
  let parentId: string | null = null;
  let parentSummary:
    | ICommunityBbsCommunityCategory.ISummary
    | null
    | undefined = null;
  if (body.parent_code !== undefined && body.parent_code !== null) {
    const parent =
      await MyGlobal.prisma.community_bbs_community_categories.findFirst({
        where: { code: body.parent_code, deleted_at: null },
        select: {
          id: true,
          code: true,
          title: true,
          description: true,
          display_order: true,
          parent_id: true,
          created_at: true,
          updated_at: true,
        },
      });
    if (!parent) throw new HttpException("Parent category not found", 400);
    if (parent.code === body.code)
      throw new HttpException(
        "Invalid parent: cannot set category as its own parent",
        400,
      );
    parentId = parent.id;
    parentSummary = {
      id: parent.id as string & tags.Format<"uuid">,
      code: parent.code,
      title: parent.title,
      description: parent.description ?? null,
      display_order: parent.display_order ?? undefined,
      parent: undefined,
      created_at: parent.created_at
        ? toISOStringSafe(parent.created_at)
        : toISOStringSafe(new Date()),
      updated_at: parent.updated_at
        ? toISOStringSafe(parent.updated_at)
        : toISOStringSafe(new Date()),
    };
  }

  // Compute display_order if omitted
  const displayOrder =
    body.display_order !== undefined && body.display_order !== null
      ? Number(body.display_order)
      : (() => {
          return 0;
        })();

  // If display_order omitted, compute max among siblings
  let finalDisplayOrder: number = displayOrder;
  if (body.display_order === undefined || body.display_order === null) {
    const sibling =
      await MyGlobal.prisma.community_bbs_community_categories.findFirst({
        where: { parent_id: parentId },
        orderBy: { display_order: "desc" },
        select: { display_order: true },
      });
    finalDisplayOrder = sibling ? Number(sibling.display_order) + 1 : 0;
  }

  const newId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Transaction: create category and audit log
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const createdCategory = await tx.community_bbs_community_categories.create({
      data: {
        id: newId,
        parent_id: parentId,
        created_by_system_admin_id: systemAdmin.id,
        code: body.code,
        title: body.title,
        description: body.description ?? null,
        display_order: finalDisplayOrder,
        created_at: now,
        updated_at: now,
      },
    });

    await tx.community_bbs_audit_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        actor_type: "system_admin",
        actor_id: systemAdmin.id,
        entity: "community_bbs_community_categories",
        action: "create",
        payload: JSON.stringify({
          id: createdCategory.id,
          code: createdCategory.code,
        }),
        created_at: now,
        updated_at: now,
      },
    });

    return createdCategory;
  });

  // Build created_by summary if admin exists
  const admin = await MyGlobal.prisma.community_bbs_systemadmin.findUnique({
    where: { id: systemAdmin.id },
    select: {
      id: true,
      display_name: true,
      is_super_admin: true,
      created_at: true,
    },
  });

  const created_by = admin
    ? {
        id: admin.id as string & tags.Format<"uuid">,
        display_name: admin.display_name ?? null,
        is_super_admin: admin.is_super_admin ?? undefined,
        created_at: admin.created_at ? toISOStringSafe(admin.created_at) : null,
      }
    : null;

  const result: ICommunityBbsCommunityCategory = {
    id: created.id as string & tags.Format<"uuid">,
    code: created.code,
    title: created.title,
    description: created.description ?? null,
    display_order: Number(created.display_order) as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    parent: parentSummary ?? null,
    created_by: created_by ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: null,
  };

  return result;
}
