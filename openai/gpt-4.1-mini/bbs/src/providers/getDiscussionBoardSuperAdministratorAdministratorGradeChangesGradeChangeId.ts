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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { DiscussionBoardAdministratorGradeChangeTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdministratorAdministratorGradeChangesGradeChangeId(props: {
  superAdministrator: SuperadministratorPayload;
  gradeChangeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  const record =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findUnique(
      {
        where: { id: props.gradeChangeId },
        ...DiscussionBoardAdministratorGradeChangeTransformer.select(),
      },
    );
  if (!record) {
    throw new HttpException("Not Found", 404);
  }
  return await DiscussionBoardAdministratorGradeChangeTransformer.transform(
    record,
  );
}
