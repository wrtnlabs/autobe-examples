import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardAdministratorGradeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGradeHistory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorGradeHistoryTransformer } from "../transformers/DiscussionBoardAdministratorGradeHistoryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminAdministratorGradeHistoriesAdministratorGradeHistoryId(props: {
  admin: AdminPayload;
  administratorGradeHistoryId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministratorGradeHistory> {
  const history =
    await MyGlobal.prisma.discussion_board_administrator_grade_histories.findUniqueOrThrow(
      {
        where: { id: props.administratorGradeHistoryId },
        ...DiscussionBoardAdministratorGradeHistoryTransformer.select(),
      },
    );
  return await DiscussionBoardAdministratorGradeHistoryTransformer.transform(
    history,
  );
}
