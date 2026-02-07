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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardAdministratorGradeChangeTransformer } from "../transformers/DiscussionBoardAdministratorGradeChangeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminAdministratorGradeChangesChangeId(props: {
  superAdmin: SuperadminPayload;
  changeId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGradeChange> {
  const gradeChange =
    await MyGlobal.prisma.discussion_board_administrator_grade_changes.findUnique(
      {
        where: { id: props.changeId },
        ...DiscussionBoardAdministratorGradeChangeTransformer.select(),
      },
    );
  if (!gradeChange) {
    throw new HttpException("Administrator grade change record not found", 404);
  }
  return await DiscussionBoardAdministratorGradeChangeTransformer.transform(
    gradeChange,
  );
}
