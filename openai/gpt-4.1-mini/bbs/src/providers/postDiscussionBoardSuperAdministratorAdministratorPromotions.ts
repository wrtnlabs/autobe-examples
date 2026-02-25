import { IDiscussionBoardAdministratorPromotionResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionResult";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdministratorAdministratorPromotions(props: {
  superAdministrator: SuperadministratorPayload;
}): Promise<IDiscussionBoardAdministratorPromotionResult> {
  const prisma = MyGlobal.prisma;
  const promoterId = props.superAdministrator.id;
  // Locate the promoter record in administrators table
  const promoter = await prisma.discussion_board_administrators.findUnique({
    where: { id: promoterId },
    select: { id: true, grade_id: true },
  });
  if (!promoter) {
    return {
      success: false,
      message: "Promoter administrator record not found",
    };
  }
  // Check that promoter is super administrator grade
  if (promoter.grade_id !== "super_admin") {
    return { success: false, message: "Only super administrators can promote" };
  }
  // Since no parameter for promoted admin id is given, we cannot promote others
  // Assume self promotion forbidden, and the only option is failure
  return {
    success: false,
    message: "No target administrator to promote specified",
  };
}
