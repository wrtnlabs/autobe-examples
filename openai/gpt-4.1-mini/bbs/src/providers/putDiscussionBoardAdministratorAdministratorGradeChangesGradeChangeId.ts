import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IDiscussionBoardAdministratorGradeChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeChange";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { DiscussionBoardAdministratorGradeChangeTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putDiscussionBoardAdministratorAdministratorGradeChangesGradeChangeId(props: {
  administrator: AdministratorPayload;
  gradeChangeId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAdministratorGradeChange.IUpdate;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  // Validate existence of the target grade change record
  await MyGlobal.prisma.discussion_board_administrator_grade_changes.findUniqueOrThrow(
    {
      where: { id: props.gradeChangeId },
    },
  );
  // Validate referenced administrator and grade if provided
  if (props.body.discussion_board_administrator_id !== undefined) {
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: props.body.discussion_board_administrator_id },
      select: { id: true },
    });
  }
  if (props.body.discussion_board_administrator_grade_id !== undefined) {
    await MyGlobal.prisma.discussion_board_administrator_grades.findUniqueOrThrow(
      {
        where: { id: props.body.discussion_board_administrator_grade_id },
        select: { id: true },
      },
    );
  }
  // Generate ISO string for updated_at
  const updatedAt: string & tags.Format<"date-time"> =
    new Date().toISOString() as string & tags.Format<"date-time">;
  // Perform the update in a transaction
  const updated = await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.discussion_board_administrator_grade_changes.update({
      where: { id: props.gradeChangeId },
      data: {
        ...(props.body.discussion_board_administrator_id !== undefined && {
          discussion_board_administrator_id:
            props.body.discussion_board_administrator_id,
        }),
        ...(props.body.discussion_board_administrator_grade_id !==
          undefined && {
          discussion_board_administrator_grade_id:
            props.body.discussion_board_administrator_grade_id,
        }),
        updated_at: updatedAt,
      },
    });
    return await tx.discussion_board_administrator_grade_changes.findUniqueOrThrow(
      {
        where: { id: props.gradeChangeId },
        ...DiscussionBoardAdministratorGradeChangeTransformer.select(),
      },
    );
  });
  // Transform result
  return await DiscussionBoardAdministratorGradeChangeTransformer.transform(
    updated,
  );
}
