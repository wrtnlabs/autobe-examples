import { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAdministratorTransformer } from "../transformers/DiscussionBoardAdministratorTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdministratorsAdministratorId(props: {
  administratorId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdministrator> {
  const record =
    await MyGlobal.prisma.discussion_board_administrators.findUniqueOrThrow({
      where: { id: props.administratorId },
      ...DiscussionBoardAdministratorTransformer.select(),
    });
  const result =
    await DiscussionBoardAdministratorTransformer.transform(record);
  return result;
}
