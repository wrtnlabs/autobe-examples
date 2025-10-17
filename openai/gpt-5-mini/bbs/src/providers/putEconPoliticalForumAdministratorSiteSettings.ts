import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function putEconPoliticalForumAdministratorSiteSettings(props: {
  administrator: AdministratorPayload;
  body: IEconPoliticalForumSiteSetting.IUpdate;
}): Promise<IEconPoliticalForumSiteSetting> {
  const { administrator, body } = props;

  if (!administrator || !administrator.id) {
    throw new HttpException("Unauthorized", 401);
  }

  const hasUpdate =
    body.value !== undefined ||
    body.description !== undefined ||
    body.environment !== undefined ||
    body.is_public !== undefined;

  if (!hasUpdate) {
    throw new HttpException("Bad Request: no updatable fields provided", 400);
  }

  const existing =
    await MyGlobal.prisma.econ_political_forum_site_settings.findFirst({
      where: { deleted_at: null },
    });

  if (!existing) throw new HttpException("Not Found", 404);

  if (body.environment !== undefined) {
    const conflict =
      await MyGlobal.prisma.econ_political_forum_site_settings.findFirst({
        where: {
          key: existing.key,
          environment: body.environment,
          deleted_at: null,
          NOT: { id: existing.id },
        },
      });

    if (conflict) {
      throw new HttpException(
        "Conflict: setting key already exists in target environment",
        409,
      );
    }
  }

  const now = toISOStringSafe(new Date());

  const updated =
    await MyGlobal.prisma.econ_political_forum_site_settings.update({
      where: { id: existing.id },
      data: {
        value: body.value ?? undefined,
        description:
          body.description === undefined ? undefined : body.description,
        environment:
          body.environment === undefined ? undefined : body.environment,
        is_public: body.is_public ?? undefined,
        updated_at: now,
      },
    });

  const auditDetails = JSON.stringify({
    previous: {
      value: existing.value,
      description: existing.description,
      environment: existing.environment,
      is_public: existing.is_public,
    },
    changes: {
      value: body.value === undefined ? undefined : body.value,
      description:
        body.description === undefined ? undefined : body.description,
      environment:
        body.environment === undefined ? undefined : body.environment,
      is_public: body.is_public === undefined ? undefined : body.is_public,
    },
  });

  await MyGlobal.prisma.econ_political_forum_audit_logs.create({
    data: {
      id: v4(),
      registereduser_id: administrator.id,
      action_type: "update",
      target_type: "site_setting",
      target_identifier: existing.key,
      details: auditDetails,
      created_at: now,
      created_by_system: false,
    },
  });

  return {
    id: updated.id,
    key: updated.key,
    value: updated.value,
    description: updated.description ?? null,
    environment: updated.environment ?? null,
    is_public: updated.is_public,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
