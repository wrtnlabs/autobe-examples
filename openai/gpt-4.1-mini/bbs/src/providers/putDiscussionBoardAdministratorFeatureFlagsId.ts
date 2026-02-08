import { IDiscussionBoardFeatureFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardFeatureFlag";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorFeatureFlagsId(props: {
  administrator: AdministratorPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardFeatureFlag.IUpdate;
}): Promise<IDiscussionBoardFeatureFlag> {
  const id = props.id;
  const body = props.body as Partial<{
    code?: string;
    name?: string;
    description?: string | null;
    enabled?: boolean;
  }>;
  const prisma = MyGlobal.prisma;
  return await prisma.$transaction(async (tx) => {
    const existing = await tx.discussion_board_feature_flags.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new HttpException("Feature flag not found", 404);
    }
    if (body.code !== undefined) {
      const conflict = await tx.discussion_board_feature_flags.findFirst({
        where: { code: body.code, id: { not: id } },
      });
      if (conflict) {
        throw new HttpException("Feature flag code must be unique", 400);
      }
    }
    const updateData: {
      code?: string | Prisma.StringFieldUpdateOperationsInput;
      name?: string | Prisma.StringFieldUpdateOperationsInput;
      description?:
        | string
        | Prisma.StringFieldUpdateOperationsInput
        | undefined;
      enabled?: boolean | Prisma.BoolFieldUpdateOperationsInput;
      updated_at: string & tags.Format<"date-time">;
    } = { updated_at: toISOStringSafe(new Date()) };
    if (body.code !== undefined) updateData.code = body.code;
    if (body.name !== undefined) updateData.name = body.name;
    // Do NOT assign null to description since Prisma disallows null in update
    if (body.description !== undefined && body.description !== null) {
      updateData.description = body.description;
    }
    if (body.enabled !== undefined) updateData.enabled = body.enabled;
    const updated = await tx.discussion_board_feature_flags.update({
      where: { id },
      data: updateData,
    });
    await tx.discussion_board_audit_logs.create({
      data: {
        id: v4(),
        event_type: "update",
        event_description: `Updated feature flag ${id}`,
        created_at: toISOStringSafe(new Date()),
        updated_at: toISOStringSafe(new Date()),
      },
    });
    return updated;
  });
}
