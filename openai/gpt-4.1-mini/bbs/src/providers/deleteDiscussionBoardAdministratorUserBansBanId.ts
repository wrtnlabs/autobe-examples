import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { INullResponse } from "@ORGANIZATION/PROJECT-api/lib/structures/INullResponse";
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

export async function deleteDiscussionBoardAdministratorUserBansBanId(props: {
  administrator: AdministratorPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<INullResponse> {
  try {
    await MyGlobal.prisma.discussion_board_user_bans.delete({
      where: { id: props.banId },
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (
        error as {
          code?: string;
        }
      ).code === "P2025"
    ) {
      throw new HttpException("Ban record not found", 404);
    }
    throw error;
  }
  return {};
}
