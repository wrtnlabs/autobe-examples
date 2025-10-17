import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumTag";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putEconPoliticalForumAdministratorTagsTagId(props: {
  administrator: AdministratorPayload;
  tagId: string & tags.Format<"uuid">;
  body: IEconPoliticalForumTag.IUpdate;
}): Promise<IEconPoliticalForumTag> {
  const { administrator, tagId, body } = props;

  // Authorization: ensure administrator is enrolled and active
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });
  if (admin === null) {
    throw new HttpException("Unauthorized: administrator not enrolled", 403);
  }

  // Fetch existing tag (must be active)
  const existing = await MyGlobal.prisma.econ_political_forum_tags.findFirst({
    where: {
      id: tagId,
      deleted_at: null,
    },
  });
  if (existing === null) {
    throw new HttpException("Tag not found or already deleted", 404);
  }

  // Prepare normalized values and validate
  let slugNormalized: string | undefined = undefined;
  if (body.slug !== undefined) {
    const raw = body.slug.trim().toLowerCase();
    slugNormalized = raw
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "");

    if (slugNormalized.length === 0 || slugNormalized.length > 100) {
      throw new HttpException(
        "Invalid slug: must be 1-100 URL-safe lowercase characters",
        400,
      );
    }
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugNormalized)) {
      throw new HttpException(
        "Invalid slug: must contain only lower-case letters, numbers and single hyphens between segments",
        400,
      );
    }
  }

  if (body.name !== undefined) {
    const nameTrimmed = body.name.trim();
    if (nameTrimmed.length === 0 || nameTrimmed.length > 100) {
      throw new HttpException("Invalid name: must be 1-100 characters", 400);
    }
  }

  if (body.description !== undefined && body.description !== null) {
    const descTrimmed = body.description.trim();
    if (descTrimmed.length > 2000) {
      throw new HttpException(
        "Invalid description: must be at most 2000 characters",
        400,
      );
    }
  }

  // Uniqueness checks among active tags
  if (body.name !== undefined && body.name.trim() !== existing.name) {
    const conflict = await MyGlobal.prisma.econ_political_forum_tags.findFirst({
      where: {
        name: body.name.trim(),
        deleted_at: null,
        NOT: { id: tagId },
      },
    });
    if (conflict) {
      throw new HttpException(
        "Conflict: name already in use by another active tag",
        409,
      );
    }
  }

  if (slugNormalized !== undefined && slugNormalized !== existing.slug) {
    const conflict = await MyGlobal.prisma.econ_political_forum_tags.findFirst({
      where: {
        slug: slugNormalized,
        deleted_at: null,
        NOT: { id: tagId },
      },
    });
    if (conflict) {
      throw new HttpException(
        "Conflict: slug already in use by another active tag",
        409,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  // Perform update
  const updated = await MyGlobal.prisma.econ_political_forum_tags.update({
    where: { id: tagId },
    data: {
      ...(body.name !== undefined && { name: body.name.trim() }),
      ...(slugNormalized !== undefined && { slug: slugNormalized }),
      description:
        body.description === undefined
          ? undefined
          : body.description === null
            ? null
            : body.description.trim(),
      updated_at: now,
    },
  });

  // Record audit log
  const changedFields: Record<
    string,
    { before: string | null; after: string | null }
  > = {};
  if (body.name !== undefined && body.name.trim() !== existing.name) {
    changedFields.name = { before: existing.name, after: updated.name };
  }
  if (slugNormalized !== undefined && slugNormalized !== existing.slug) {
    changedFields.slug = { before: existing.slug, after: updated.slug };
  }
  if (body.description !== undefined) {
    const beforeDesc =
      existing.description === null ? null : existing.description;
    const afterDesc = updated.description === null ? null : updated.description;
    if (beforeDesc !== afterDesc)
      changedFields.description = { before: beforeDesc, after: afterDesc };
  }

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "update",
      target_type: "tag",
      target_identifier: tagId,
      details: Object.keys(changedFields).length
        ? JSON.stringify(changedFields)
        : null,
      created_at: now,
      created_by_system: false,
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    name: updated.name,
    slug: updated.slug,
    description: updated.description === null ? null : updated.description,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  } satisfies IEconPoliticalForumTag;
}
