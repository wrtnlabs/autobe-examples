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

export async function deleteDiscussionBoardAdministratorAdministratorGradeChangesGradeChangeId(props: {
  administrator: AdministratorPayload;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.delete({
      where: { id: props.gradeChangeId },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      (
        error as unknown as {
          code?: string;
        }
      ).code === "P2025"
    ) {
      throw new HttpException("Not Found", 404);
    }
    throw error;
  }
}
