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

export async function postEconPoliticalForumAdministratorTags(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumTag.ICreate;
}): Promise<IEconPoliticalForumTag> {
  const { administrator, body } = props;

  // Authorization: ensure administrator enrollment exists and is active
  const admin =
    await MyGlobal.prisma.econ_political_forum_administrator.findFirst({
      where: {
        registereduser_id: administrator.id,
        deleted_at: null,
      },
    });
  if (admin === null)
    throw new HttpException("Unauthorized: administrator not enrolled", 403);

  // Slug validation: URL-friendly lower-case hyphenated slug
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  if (!slugPattern.test(body.slug)) {
    throw new HttpException("Bad Request: invalid slug format", 400);
  }

  // Uniqueness check for name or slug among active tags
  const existing = await MyGlobal.prisma.econ_political_forum_tags.findFirst({
    where: {
      deleted_at: null,
      OR: [{ slug: body.slug }, { name: body.name }],
    },
  });
  if (existing) {
    if (existing.slug === body.slug)
      throw new HttpException("Conflict: slug already exists", 409);
    throw new HttpException("Conflict: name already exists", 409);
  }

  // Prepare identifiers and timestamps
  const id = v4() satisfies string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create tag
  const created = await MyGlobal.prisma.econ_political_forum_tags.create({
    data: {
      id,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Record audit log for traceability
  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4() satisfies string & tags.Format<"uuid">,
      registereduser_id: administrator.id,
      action_type: "create",
      target_type: "tag",
      target_identifier: created.id,
      details: `Tag created: ${created.name}`,
      created_at: now,
      created_by_system: false,
    },
  });

  // Build and return response, converting Date fields to ISO strings
  const response = {
    id: created.id,
    name: created.name,
    slug: created.slug,
    description: created.description ?? null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  } satisfies IEconPoliticalForumTag;

  return response;
}
