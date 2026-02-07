import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorGradeChangeTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAdministratorsAdministratorIdGradeChangesGradeChangeId(props: {
  admin: AdminPayload;
  administratorId: string & tags.Format<"uuid">;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  const gradeChange =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findFirst(
      {
        where: {
          id: props.gradeChangeId,
          administrator_id: props.administratorId,
        },
        ...DiscussionBoardAdministratorGradeChangeTransformer.select(),
      },
    );
  if (!gradeChange) {
    throw new HttpException("Grade change record not found", 404);
  }
  return await DiscussionBoardAdministratorGradeChangeTransformer.transform(
    gradeChange,
  );
}
